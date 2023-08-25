import mysql.connector as mysql
from mysql.connector import Error

dbName = ""

def DBConnect():
    db = ""
    try:
        hostName = ""
        userName = ""
        password = ""
        db = mysql.connect(host=hostName,
                           user=userName,
                           password=password,
                           database=dbName)
    except Error as e:
        db = "Error while connecting to MySQL: %s" % e
    return db


def GetBuildings():
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM " + dbName + ".Building")
        data = cursor.fetchall()
        buildings = []
        for row in data:
            buildings.append(row[:2])
        return buildings


def GetApartments(building):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "SELECT ApartmentKey, ApartmentName FROM " + dbName + ".Apartment WHERE BuildingKey = %s" % (str(building))
        cursor.execute(statement)
        data = cursor.fetchall()
        return data


def NewUnitCost(building, unitCost, unitType):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "INSERT INTO " + dbName + ".Rate(BuildingKey, Rate, ReadingUnitKey) VALUES(%s, %s, %s)" % (str(building), str(unitCost), str(unitType))
        cursor.execute(statement)
        db.commit()


def GetUnitCosts(building):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        rangeNum = 0
        if building == "1":
            rangeNum = 3
        elif building == "2":
            rangeNum = 4
        data = []
        for i in range(1,rangeNum):
            statement = "SELECT Rate FROM " + dbName + ".Rate WHERE BuildingKey = %s AND ReadingUnitKey = %s" % (str(building), str(i))
            cursor.execute(statement)
            unitCosts = cursor.fetchall()
            data.append(unitCosts[len(unitCosts) - 1][0])
        return data


def GetReading(apartmentKey, unitType, date, isMin):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        order = ""
        if(isMin):
            order = "ASC"
        else:
            order = "DESC"
        statement = "SELECT Reading FROM " + dbName + ".Reading WHERE ReadingUnitKey = %s AND ApartmentKey = %s AND DATE(STR_TO_DATE(UtilityDate, \"%%Y-%%m-%%d %%T\")) = \"%s\" ORDER BY TIME(STR_TO_DATE(UtilityDate, \"%%Y-%%m-%%d %%T\")) %s LIMIT 1"
        statement = statement % (str(unitType), str(apartmentKey), str(date), order)
        cursor.execute(statement)
        reading = cursor.fetchone()
        return reading[0]


def GetAddress(building):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "SELECT StreetName, City, State, Zipcode FROM " + dbName + ".Address WHERE AddressKey = %s" % (str(building))
        cursor.execute(statement)
        data = cursor.fetchall()
        return data[0]


def GetApartmentKey(building, apartmentName):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "SELECT ApartmentKey, IncludeGas FROM " + dbName + ".Apartment WHERE BuildingKey = %s AND ApartmentName = \"%s\"" % (str(building), str(apartmentName))
        cursor.execute(statement)
        data = cursor.fetchall()
        return data[0]


def GetTenantName(apartmentKey):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "SELECT FirstName, LastName FROM " + dbName + ".Tenant WHERE ApartmentKey = %s AND CurrentTenant = 1" % (str(apartmentKey))
        cursor.execute(statement)
        data = cursor.fetchall()
        return data[0]


def GetTenantEmail(apartmentKey):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "SELECT TenantEmail FROM " + dbName + ".Tenant WHERE ApartmentKey = %s AND CurrentTenant = 1" % (str(apartmentKey))
        cursor.execute(statement)
        data = cursor.fetchall()
        return data[0]


def GetTenantInfo(apartmentKey):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "SELECT FirstName, LastName, PhoneNumber, TenantEmail, TenantKey FROM " + dbName + ".Tenant WHERE ApartmentKey = %s" % (str(apartmentKey))
        cursor.execute(statement)
        data = cursor.fetchall()
        return data

def InsertTenant(firstName, lastName, phoneNumber, tenantEmail, buildingKey, apartmentKey, currentTenant):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "INSERT INTO " + dbName + ".Tenant(FirstName, LastName, PhoneNumber, TenantEmail, AddressKey, ApartmentKey, CurrentTenant) VALUES (\"%s\",\"%s\",\"%s\",\"%s\",%s,%s,%s)"
        statement = statement % (str(firstName), str(lastName), str(phoneNumber), str(tenantEmail), str(buildingKey), str(apartmentKey), str(currentTenant))
        cursor.execute(statement)
        db.commit()

def UpdateTenant(tenantKey, currentTenant):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "UPDATE " + dbName + ".Tenant SET CurrentTenant = %s WHERE TenantKey = %s"
        statement = statement % (str(currentTenant), str(tenantKey))
        cursor.execute(statement)
        db.commit()

def GetLoginInfo():
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "SELECT Username, Password FROM " + dbName + ".User"
        cursor.execute(statement)
        data = cursor.fetchone()
        return data

def checkCredentials(tenantEmail):
    db = DBConnect()
    if type(db) == str:
        raise Exception(db)
    else:
        cursor = db.cursor()
        statement = "SELECT TenantKey FROM " + dbName + ".Tenant WHERE TenantEmail = \"%s\" AND CurrentTenant = 1" % (str(tenantEmail))
        cursor.execute(statement)
        data = cursor.fetchall()
        return data


