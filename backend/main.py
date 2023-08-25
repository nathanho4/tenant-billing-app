from fastapi import Request, FastAPI
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector as mysql
import DBConnector
from datetime import datetime
from fastapi.responses import FileResponse
import os
import pypdftk
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import zipfile
import io
from fastapi.responses import StreamingResponse
import csv

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
billingInfo = {} #used for accessing information about the utility bills when emailing out the bills to tenants

app = FastAPI()


#needed during local testing to allow for separate backend and frontend interaction
origins = [
    #list url/ip address origins
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"]
)


#gets building list from database
@app.get("/api/buildings")
def Buildings():
    return DBConnector.GetBuildings()


@app.get("/api/apartments1933")
def apartments():
    return DBConnector.GetApartments(2)


@app.get("/api/apartments510")
def apartments():
    return DBConnector.GetApartments(1)


#returns list of months prior to the current month
@app.get("/api/billingMonths")
def billingMonths():
    currentMonth = datetime.now().month
    returnMonths = []
    for i in range(currentMonth - 1):
        returnMonths.append(MONTHS[i])
    return returnMonths


#based on the items passed in the request, either returns unit costs from the database
#or uploads new unit costs to the database; post requests stops anyone from simply
#accessing the api to see this information
@app.post("/api/unitCosts")
async def unitCost(request: Request):
    requestData = await request.json()
    items = requestData['title'].split(",")
    returnData = 0
    if len(items) == 3:
        DBConnector.NewUnitCost(items[0], items[1], items[2])
        returnData = 1
    if len(items) == 1:
        returnData = DBConnector.GetUnitCosts(items[0])
    return returnData


#retrieves tenant First Name, Last Name, Phone Number, Email, and TenantKey based on tenant's apartment key
@app.get("/api/TenantInfo/{apartmentKey}")
def GetTenantInfo(apartmentKey: str):
    try:
        returnInfo = DBConnector.GetTenantInfo(apartmentKey)
        return returnInfo
    except Exception:
        return 0


#updates the status of the tenant based on whether they are a current tenant or not
@app.get("/api/UpdateTenant/{tenantKey}/{currentTenant}")
def UpdateTenant(tenantKey: str, currentTenant: str):
    try:
        DBConnector.UpdateTenant(tenantKey, currentTenant)
        return 1
    except Exception:
        return 0


#Inserts a new tenant into the database 
@app.get("/api/NewTenant/{firstName}/{lastName}/{phoneNumber}/{tenantEmail}/{buildingKey}/{apartmentKey}/{currentTenant}")
def NewTenant(firstName: str,lastName: str, phoneNumber: str, tenantEmail: str, buildingKey: str, apartmentKey: str, currentTenant: str):
    try:
        DBConnector.InsertTenant(firstName, lastName, phoneNumber, tenantEmail, buildingKey, apartmentKey, currentTenant)
        return 1
    except Exception:
        return 0


#all the necessary information is passed through the dynamic api route
@app.get("/api/GenerateBills/{buildingKey}/{startDate}/{endDate}/{dueDate}/{apartments}")
def GenerateBills(buildingKey: str,startDate: str, endDate: str, dueDate: str, apartments: str):
    #clears the billingInfo dict to prepare for new utility bills

    apartments = apartments.split("-")
    print(buildingKey, startDate, endDate, dueDate, apartments)
    pdfDir = os.getcwd() + "/UtilityBills"

    #clears UtilityBills directory
    dirList = os.listdir(pdfDir)
    if(len(dirList) > 0):
        for f in os.listdir(pdfDir):
            os.remove(os.path.join(pdfDir, f))

    addressData = DBConnector.GetAddress(buildingKey)
    streetName = addressData[0]
    cityStateZipcode = addressData[1] + ", " + addressData[2] + " " + str(addressData[3])
    building = "".join(streetName.split(" "))
    billingInfo["building"] = building

    #changes the date from "YYYY-MM-DD" format to "MM-DD-YYYY" format;
    #previous format needed to get readings data from database
    splitStartDate = startDate.split("-")
    finalStartDate = "-".join([splitStartDate[1], splitStartDate[2], splitStartDate[0]])
    splitEndDate = endDate.split("-")
    finalEndDate = "-".join([splitEndDate[1], splitEndDate[2], splitEndDate[0]])
    splitDueDate = dueDate.split("-")
    finalDueDate = "-".join([splitDueDate[1], splitDueDate[2], splitDueDate[0]])

    dateRange = finalStartDate + "-to-" + finalEndDate
    billingInfo["dateRange"] = [finalStartDate, finalEndDate, finalDueDate]

    filepathList = []

    utilityData = []
    if buildingKey == "2":
        utilityData.append(["Apartment", "Water", "Electricity", "Gas"])
    else:
        utilityData.append(["Apartment", "Water", "Electricity"])
    #loops through list of apartments passed and generates a utility bill pdf for each
    for apartment in apartments:
        finalApartment = ""
        if apartment == "CarriageHouse":
            finalApartment = "Carriage House"
        else:
            finalApartment = apartment

        apartmentInfo = DBConnector.GetApartmentKey(buildingKey, apartment)
        apartmentKey = apartmentInfo[0]
        withGas = int(apartmentInfo[1])

        tenantInfo = ""
        tenantName = ""
        tenantEmail = ""
        #the public utility bill is only for the property manager to see;
        #this includes electricity used in the properties hallways or other public usages
        if apartment != "Public":
            tenantInfo = DBConnector.GetTenantName(apartmentKey)
            tenantName = tenantInfo[0] + " " + tenantInfo[1]
            tenantEmail = DBConnector.GetTenantEmail(apartmentKey)

        unitCosts = DBConnector.GetUnitCosts(buildingKey)
        waterUnitCost = unitCosts[0]
        electricUnitCost = unitCosts[1]
        gasUnitCost = 0

        #Calculations necessary for a specific building 
        waterUsage = 0
        electricUsage = 0
        gasUsage = 0
        gasTotal = 0
        if buildingKey == "2":
            waterUsage = calculate1933WaterTotal(startDate, endDate, apartmentKey)
            electricUsage = calculate1933ElectricTotal(startDate, endDate, apartmentKey)
            if(withGas):
                gasUsage = float(DBConnector.GetReading(apartmentKey, 3, endDate, False)) - float(DBConnector.GetReading(apartmentKey, 3, startDate, True))
                gasUsage = gasUsage / (96.7 * 10)
                gasUnitCost = unitCosts[2]
                gasTotal = gasUnitCost * gasUsage

        else:
            usages = []
            for i in range(1, 3):
                startReading = float(DBConnector.GetReading(apartmentKey, i, startDate, True))
                endReading = float(DBConnector.GetReading(apartmentKey, i, endDate, False))
                usages.append(endReading - startReading)
            waterUsage = usages[0]
            electricUsage = usages[1]

        waterTotal = waterUsage * waterUnitCost
        electricityTotal = electricUsage * electricUnitCost

        #all of the fields necessary to fill out the utility bill template
        dataDict = {
            "start_date": finalStartDate,
            "end_date": finalEndDate,
            "tennant_name": tenantName,
            "apartment": "Apartment %s" % finalApartment,
            "street_name": streetName,
            "end_address": cityStateZipcode,
            "electricity_usage": "%.2f KWH" % electricUsage,
            "electricity_unit_price": electricUnitCost,
            "electricity_total": "$%.2f" % electricityTotal,
            "water_usage": "%.2f Gallons" % waterUsage,
            "water_unit_price": waterUnitCost,
            "water_total": "$%.2f" % waterTotal,
            "gas_usage": "%.2f Therms" % gasUsage,
            "gas_unit_cost": gasUnitCost,
            "gas_total": "$%.2f" % gasTotal,
            "total": "$%.2f" % (electricityTotal + waterTotal + gasTotal),
            "due_date": finalDueDate
        }
        if gasUsage == 0:
            utilityData.append([apartment, waterUsage, electricUsage])
        else:
            utilityData.append([apartment, waterUsage, electricUsage, gasUsage])

        #creates the file name and path
        currentDir = os.getcwd()
        newPath = currentDir + "/UtilityBills"
        fileName = building + "-" + apartment + "-" + dateRange + ".pdf"
        filePath = newPath + "/" + fileName

        templatePath = ""
        if withGas:
            templatePath = currentDir + "/BillTemplates/bill_template_with_gas.pdf"
        else:
            templatePath = currentDir + "/BillTemplates/bill_template.pdf"

        filepathList.append(filePath)
        fill_pdf_form(templatePath, filePath, dataDict)
        billingInfo[filePath] = [tenantName, tenantEmail, finalApartment]

    pypdftk.concat(filepathList, pdfDir+"/AllBills.pdf")
    print("utilityData:", utilityData)
    writeCSV(utilityData) #creates CSV file containing the utility data for all apartments the user selected
                          #this is included in the zip file containing the utility bills that the user can download 
    return "1"


def fill_pdf_form(templatePath, file_name, data_dict):
    pypdftk.fill_form(templatePath, data_dict, out_file=file_name, flatten=True)


def writeCSV(utilityData):
    with open(os.getcwd() + '/UtilityBills/data.csv', 'w') as csvfile:
        dataWriter = csv.writer(csvfile)
        for row in utilityData:
            print(row)
            dataWriter.writerow(row)


#calculates the total water usage for each apartment in this building by taking the hot water (public water) 
#and splitting it proportionally amongst the tenants based on total water usage
def calculate1933WaterTotal(startDate, endDate, apartmentKey):
    publicWaterTotal = float(DBConnector.GetReading(18, 1, endDate, False)) - float(DBConnector.GetReading(18, 1, startDate, True))
    if apartmentKey == 18 or apartmentKey == "18":
        return publicWaterTotal
    totalWaterUsage = 0
    for i in range(10, 17):
        startReading = float(DBConnector.GetReading(i, 1, startDate, True))
        endReading = float(DBConnector.GetReading(i, 1, endDate, False))
        totalWaterUsage = totalWaterUsage + (endReading - startReading)

    apartmentWaterTotal = float(DBConnector.GetReading(apartmentKey, 1, endDate, False)) - float(DBConnector.GetReading(apartmentKey, 1, startDate, True))
    finalTotal = (totalWaterUsage + publicWaterTotal) * (apartmentWaterTotal / totalWaterUsage)
    return finalTotal


#calculates the total electricity usage for each apartment in this building; some apartments are subpanels for other apartments, so calculations 
#must be done to get those apartments' total electricity usage
def calculate1933ElectricTotal(startDate, endDate, apartmentKey):
    total = float(DBConnector.GetReading(apartmentKey, 2, endDate, False)) - float(DBConnector.GetReading(apartmentKey, 2, startDate, True))
    if apartmentKey == "10" or apartmentKey == 10:
        carriageHouseTotal = float(DBConnector.GetReading(16, 2, endDate, False)) - float(DBConnector.GetReading(16, 2, startDate, True))
        publicTotal = float(DBConnector.GetReading(18, 2, endDate, False)) - float(DBConnector.GetReading(18, 2, startDate, True))
        total = total - carriageHouseTotal - publicTotal
    elif apartmentKey == "14" or apartmentKey == 14:
        apt1BTotal = float(DBConnector.GetReading(11, 2, endDate, False)) - float(DBConnector.GetReading(11, 2, startDate, True))
        total = total - apt1BTotal
    elif apartmentKey == "15" or apartmentKey == 15:
        apt2FTotal = float(DBConnector.GetReading(12, 2, endDate, False)) - float(DBConnector.GetReading(12, 2, startDate, True))
        total = total - apt2FTotal
    return total


#compiles all of the utility bills into one long pdf for the user to preview
@app.get("/api/AllBills")
def getAllBills():
    folderPath = os.getcwd() + "/UtilityBills"
    fileName = "AllBills.pdf"
    filePath = folderPath + "/" + fileName
    returnResponse = FileResponse(filePath, media_type="application/pdf")
    return returnResponse


#clears the UtilityBills directory
@app.get("/api/DeleteAllBills")
def deleteAllBills():
    folderPath = os.getcwd() + "/UtilityBills"
    fileName = "AllBills.pdf"
    filePath = folderPath + "/" + fileName
    dirList = sorted(os.listdir(folderPath))
    print(dirList)
    if fileName in dirList:
        os.remove(os.path.join(folderPath, dirList[len(dirList)-1]))


#streams the contents of UtilityBills directory into a zip file
@app.get("/api/SaveBills")
def saveBills():
    folderPath = os.getcwd() + "/UtilityBills"
    dirList = os.listdir((folderPath))
    zip_subdir = ""
    zip_io = io.BytesIO()
    with zipfile.ZipFile(zip_io, mode='w', compression=zipfile.ZIP_DEFLATED) as temp_zip:
        for fpath in dirList:
            if fpath != "AllBills.pdf":
                # Calculate path for file in zip
                fdir, fname = os.path.split(fpath)
                zip_path = os.path.join(zip_subdir, fname)
                # Add file, at correct path
                temp_zip.write(folderPath + "/" + fpath, zip_path)
    dateInfo = billingInfo["dateRange"]
    filename = billingInfo["building"] + "-" + dateInfo[0] + "-to-" + dateInfo[1] + ".zip"
    return StreamingResponse(
        iter([zip_io.getvalue()]),
        media_type="application/x-zip-compressed",
        headers = { "Content-Disposition": f"attachment; filename=%s" % (filename)}
    )


@app.get("/api/EmailBills")
def emailBills():
    #def send_email_pdf(file_name, receiverEmail, receiverName, startDate, endDate, dueDate):
    # triple single quotes = string that spans multiple lines
    dateInfo = billingInfo["dateRange"]
    if len(billingInfo) > 0:
        if len(dateInfo) > 0:
            startDate = dateInfo[0]
            endDate = dateInfo[1]
            dueDate = dateInfo[2]
            for file in billingInfo:
                if file != "dateRange" and file != "building":
                    emailInfo = billingInfo[file]
                    receiverName = emailInfo[0]
                    apartment = emailInfo[2]
                    receiverEmail = ""

                    body = ""
                    if emailInfo[1] == "":  #this means that the apartment being billed is the public usage
                        receiverEmail = ""  #sends to property manager's email
                        body = billingInfo["building"] + " Public utilities from " + startDate + " to " + endDate
                    else:
                        receiverEmail = emailInfo[1][0]
                        body = "Dear " + receiverName + "," + \
                            "\n\n\nAttached is your utilities bill from " + startDate + " to " + endDate + ". Please pay by " + dueDate + " through either a check or with your rent." + \
                            "\n\nFor any questions or concerns, please contact us at chateauridge.pm@gmail.com" + "\n\n\nThanks," + "\nChateau Ridge Property Management" + "\n443-410-4234" + \
                            "\nhttp://www.chateauridgegroup.com/"


                    sender = ""
                    password = ""
                    cc = ""

                    # Setup the MIME
                    message = MIMEMultipart()
                    message['From'] = sender
                    message['To'] = receiverEmail
                    message['Cc'] = cc
                    message['Subject'] = "Apartment " + apartment + " Utility Bill"
                    message.attach(MIMEText(body, 'plain'))
                    try:
                        # open the file in bynary
                        binary_pdf = open(file, 'rb')

                        payload = MIMEBase('application', 'octate-stream', Name=file)
                        payload.set_payload(binary_pdf.read())

                        # enconding the binary into base64
                        encoders.encode_base64(payload)

                        # add header with pdf name
                        payload.add_header('Content-Decomposition', 'attachment', filename=file)
                        message.attach(payload)
                        # use gmail with port
                        #session = smtplib.SMTP('mail.chateauridge.info', 465)
                        session = smtplib.SMTP('smtp.gmail.com', 587)

                        # enable security
                        session.starttls()

                        # login with mail_id and password
                        session.login(sender, password)

                        text = message.as_string()
                        session.sendmail(sender, [cc, receiverEmail], text)
                        session.quit()
                        print('Mail Sent')

                    except Exception as e:
                        print("Error sending emails:", e)
        else:
            print("Missing date info from billingInfo dict")
    else:
        print("billingInfo dict empty")



if __name__ == "__main__":
    deleteAllBills()

