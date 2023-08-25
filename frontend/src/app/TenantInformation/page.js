'use client';
import { Alert, AppBar, Backdrop, Box, Button, CircularProgress, Drawer, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Toolbar } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useState, useEffect, useCallback, useRef } from 'react';
import MenuIcon from '@mui/icons-material/Menu';

import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

const TenantInfo = () => {
    const [buildingList, setBuildingList] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState("");
    const [apartments510, setApartments510] = useState([[]]);
    const [apartments1933, setApartments1933] = useState([[]]);
    const [apartments, setApartments] = useState([]);
    const [selectedApartment, setSelectedApartment] = useState("");
    const [rows, setRows] = useState([]);
    const [allTenants, setAllTenants] = useState([]);
    const [editsMade, setEditsMade] = useState(false);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const noButtonRef = useRef(null);
    const [promiseArguments, setPromiseArguments] = useState(null);
    const [snackbar, setSnackbar] = useState(null);
    const handleCloseSnackbar = () => setSnackbar(null);
    const disabled = (selectedApartment == "") || (selectedBuilding == "");

    var backendURL = ""; //insert backend url

  //columns of the tenant info table
    const columns = [
        {
            field: 'apartment',
            headerName: 'Apartment',
            width: 150,
            editable: false,
            headerAlign: 'center',
            align: 'center',
        },
        {
          field: 'firstName',
          headerName: 'First Name',
          width: 150,
          editable: true,
          headerAlign: 'center',
          align: 'center',
        },
        {
          field: 'lastName',
          headerName: 'Last Name',
          width: 150,
          editable: true,
          headerAlign: 'center',
          align: 'center',
        },
        {
          field: 'phoneNumber',
          headerName: 'Phone Number',
          width: 150,
          editable: true,
          headerAlign: 'center',
          align: 'center',
          //formats the phone number as xxx-xxx-xxxx
          valueFormatter: (params) => {
            let formatNumber = params.value.toString();
            if (formatNumber.length > 3 && formatNumber.length < 7) {
                return formatNumber.slice(0,3) + "-" + formatNumber.slice(3)
            }
            if (formatNumber.length > 6 && formatNumber.length < 11) {
                return formatNumber.slice(0,3) + "-" + formatNumber.slice(3,6) + "-" + formatNumber.slice(6)
            }
          }
        },
        {
          field: 'tenantEmail',
          headerName: 'Email',
          width: 250,
          editable: true,
          headerAlign: 'center',
          align: 'center',
        },
      ];
    
    //fetches building and apartment lists from backend
    useEffect(() => {
        try {
          fetch(backendURL + "/api/buildings")
          .then((response) => response.json())
            .then((data) => {
                setBuildingList(data.map((building) => {return building[1]}));
    
            });
            fetch(backendURL + "/api/apartments510")
            .then((response) => response.json())
              .then((data) => {
                setApartments510(data);
              });
              fetch(backendURL + "/api/apartments1933")
            .then((response) => response.json())
              .then((data) => {
                setApartments1933(data);
              });
        } catch(err) {
            console.log("failed to fetch buildings")
        }
        }, []);

    //depending on the building selected, sets the current list of apartments
    function buildingSelect(e) {
        setSelectedBuilding(e.target.value);
        setSelectedApartment("");
        setEditsMade(false);
        let currBuilding = e.target.value;
        if(currBuilding == buildingList[0]) {
            setApartments(apartments510);
        } else if(currBuilding == buildingList[1]) {
            setApartments(apartments1933);
        } 
    }

    function apartmentSelect(e) {
        setSelectedApartment(e.target.value);
        setEditsMade(false);
        loadTable(e.target.value);
    }

    //returns the sx component needed to make a component invisible
    function isVisible(componentDisabled) {
        if(componentDisabled  == true) {
          return { display: { xl: 'none', lg: 'none', md: 'none', sm: 'none', xs: 'none' } }
        } else {
          return {}
        }
    }

    //populates the tenant info table
    async function loadTable(apartment) {
        setRows([]);
        setLoading(true);
        setAllTenants([])
        try {

            let fetchURL = backendURL + "/api/TenantInfo/";
            let apartmentKey = getApartmentKey(apartment);
            let tenantData = [];
            //fetches the necessary tenant info from the backend
            await fetch(fetchURL + apartmentKey)
            .then((response) => response.json())
            .then((data) => {
                tenantData = data;
                setAllTenants(data);
            });
            let tenantInfo = tenantData[tenantData.length - 1];
            //creates new row for the tenant
            let newRow = { id: 0, apartment: apartment, firstName: tenantInfo[0], 
                lastName: tenantInfo[1], phoneNumber: tenantInfo[2], tenantEmail: tenantInfo[3], tenantKey: tenantInfo[4]};
            setRows(rows =>[...rows, newRow]);
        } catch (err) {
            console.log("Error fetching row data:", err);
        }
        setLoading(false);
    }


    function getApartmentKey(apartmentName) {
        for(let i=0;i<apartments.length - 1;i++) {
            if (apartments[i][1] == apartmentName) {
                return apartments[i][0]
            }
        }
    }

    //updates row upon user making a change to the table
    function rowUpdate(newRow) {
        setEditsMade(true);
        newRow.id = 0;
        setRows([newRow]);
    }

    //handles user selecting save changes on the confirm edit dialog
    function saveChanges() {
        setSnackbar({ children: "Changes successfully saved", severity: 'success' });
        let fetchURL = backendURL + "/api/NewTenant/";
        let urlInfo = rows[0].firstName + "/" + rows[0].lastName + "/" + rows[0].phoneNumber + "/" + rows[0].tenantEmail +
                    "/" + (buildingList.indexOf(selectedBuilding) + 1) + "/" + getApartmentKey(rows[0].apartment) + "/1"
        fetch(fetchURL + urlInfo);
        setEditsMade (false);
        setFormerTenants();
    }

    //tells the backend to change all instances of the tenant living in this apartment to former tenants 
    //upon a new tenant being added to the database
    function setFormerTenants() {
        let fetchURL = backendURL + "/api/UpdateTenant/";
        for (let i = 0; i < allTenants.length; i++) {
            let urlInfo = String(allTenants[i][allTenants[i].length - 1]) + "/0";
            fetch(fetchURL + urlInfo);
        }
        loadTable(selectedApartment);
    }

    //validates the user input
    const useFakeMutation = () => {
        return useCallback(
          (newRow) =>
            new Promise((resolve, reject) => {
                //empty change made
                if (newRow.firstName.trim() === '' || newRow.lastName.trim() === '' || newRow.tenantEmail.trim() === '' || newRow.phoneNumber.toString().trim() === '') {
                    reject("empty");
                //invalid phone number format
                } else if (newRow.phoneNumber.toString().length !== 10 || isNaN(newRow.phoneNumber)) {
                    reject("phoneNumber");
                //invalid email format
                } else if (newRow.tenantEmail.indexOf("@") < 0 || newRow.tenantEmail.indexOf(".") < 0) {
                    reject("email");
                } else {
                  resolve(newRow);
                }
            }),
          [],
        );
      };
      
      //computes the change message for the confirm edit dialog
      function computeMutation(newRow, oldRow) {
        if (newRow.firstName !== oldRow.firstName) {
          return `First Name from '${oldRow.firstName}' to '${newRow.firstName}'`;
        }
        if (newRow.lastName !== oldRow.lastName) {
          return `Last Name from '${oldRow.lastName || ''}' to '${newRow.lastName || ''}'`;
        }
        if (newRow.phoneNumber !== oldRow.phoneNumber) {
            return `Phone Number from '${oldRow.phoneNumber || ''}' to '${newRow.phoneNumber || ''}'`;
        }
        if (newRow.tenantEmail !== oldRow.tenantEmail) {
            return `Email from '${oldRow.tenantEmail || ''}' to '${newRow.tenantEmail || ''}'`;
        }
        return null;
      }

    const processRowUpdate = useCallback(
        (newRow, oldRow) =>
          new Promise((resolve, reject) => {
            const mutation = computeMutation(newRow, oldRow);
            if (mutation) {
              // Save the arguments to resolve or reject the promise later
              setPromiseArguments({ resolve, reject, newRow, oldRow });
            } else {
              resolve(oldRow); // Nothing was changed
            }
          }),
        [],
      );
    
      const mutateRow = useFakeMutation();

      const handleNo = () => {
        const { oldRow, resolve } = promiseArguments;
        resolve(oldRow); // Resolve with the old row to not update the internal state
        setPromiseArguments(null);
      };
    
      const handleYes = async () => {
        const { newRow, oldRow, resolve } = promiseArguments;
    
        try {
          // Make the HTTP request to save in the backend
          const response = await mutateRow(newRow);
          resolve(response);
          setPromiseArguments(null);
          rowUpdate(newRow);
        } catch (error) {
          let snackBarMessage = "";
          if (error == "empty") {
              snackBarMessage = "Cell can't be empty";
          } else if (error == "phoneNumber") {
              snackBarMessage = "Invalid phone number";
          } else if (error == "email") { 
            snackBarMessage = "Invalid email"
        } 
            setSnackbar({ children: snackBarMessage, severity: 'error' });
            resolve(oldRow);
            setPromiseArguments(null);
        }
      };
    
      const handleEntered = () => {
        // The `autoFocus` is not used because, if used, the same Enter that saves
        // the cell triggers "No". Instead, we manually focus the "No" button once
        // the dialog is fully open.
        // noButtonRef.current?.focus();
      };
      const renderConfirmDialog = () => {
        if (!promiseArguments) {
          return null;
        }
    
        const { newRow, oldRow } = promiseArguments;
        const mutation = computeMutation(newRow, oldRow);
  
  
        return (
          <Dialog
            maxWidth="xs"
            TransitionProps={{ onEntered: handleEntered }}
            open={!!promiseArguments}
          >
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogContent dividers>
              {`Pressing 'Yes' will change ${mutation}.`}
            </DialogContent>
            <DialogActions>
              <Button ref={noButtonRef} onClick={handleNo}>
                No
              </Button>
              <Button onClick={handleYes}>Yes</Button>
            </DialogActions>
          </Dialog>
        );
      };

     
  function render() {
    return (
        <div>
            <Backdrop open={loading}>
                <CircularProgress sx={{color: 'white'}}/>
            </Backdrop>
            <Box sx={{ flexGrow: 1 }}>
                <AppBar position="static">
                <Toolbar>
                    <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    aria-label="menu"
                    sx={{ mr: 2 }}
                    onClick={() => setOpen(true)}
                    >
                    <MenuIcon />
                    </IconButton>
                </Toolbar>
                </AppBar>
            </Box>
            <Drawer open={open} anchor={"left"} onClose={() => setOpen(false)}>
                <div style={{ width: 250 }} onClick={() => setOpen(false)}>
                    <Button href="/" onClick={() => setLoading(true)}>Generate Preview</Button>
                    <Button href="/TenantInformation" onClick={() => setLoading(true)}>Tenant Information</Button>
                </div>
            </Drawer>
            <br></br><br></br>
                <Stack spacing={2} justifyContent="center" alignItems="center">
                <FormControl sx={{width: "50%"}}>
                    <InputLabel id="selectBuilding" style={{textAlign: "center"}} >Select Building</InputLabel>
                        <Select labelId="selectBuilding" disabled={loading} onChange={(e) => buildingSelect(e)}>
                            {
                                buildingList.map((b, index) => {
                                    return <MenuItem key={index} value={b}>{b}</MenuItem>
                                })
                            }
                    </Select> 
                </FormControl>
                <FormControl sx={{width: "50%"}}>
                    <InputLabel id="selectApartment" style={{textAlign: "center"}} >Select Apartment</InputLabel>
                        <Select labelId="selectBuilding" disabled={selectedBuilding == "" || loading} onChange={(e) => apartmentSelect(e)}>
                            {
                                apartments.map((apartment) => {
                                    if (apartment[1] !== "Public") {
                                        return <MenuItem key={apartment[0]} value={apartment[1]}>{apartment[1]}</MenuItem>
                                    }
                                })
                            }
                    </Select> 
                </FormControl>
                {renderConfirmDialog()}
                <DataGrid rows={rows} columns={columns} 
                    processRowUpdate={processRowUpdate} 
                    disabled={disabled} 
                    sx={[isVisible(disabled), {width: "60%"}]}/>                    {
                    !!snackbar && (
                    <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} onClose={handleCloseSnackbar} autoHideDuration={6000}>
                        <Alert {...snackbar} onClose={handleCloseSnackbar} sx={{fontSize: 18}}/>
                    </Snackbar>
                )}
                <FormControl sx={{width: "15%"}}>
                    <Stack spacing={2} justifyContent="center">
                        <Stack direction="row" spacing={2} justifyContent="center">

                            <Button 
                                    variant="outlined" 
                                    disabled={disabled || !editsMade || loading} 
                                    onClick={() => saveChanges()}
                                    sx={isVisible(disabled)}
                                >Save Changes</Button>
                        </Stack>
                    </Stack>
                </FormControl>
            </Stack>
        </div>
    )
  }
  return render();
}

export default TenantInfo;
