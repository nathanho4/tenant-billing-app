'use client';
import { useState, useEffect } from 'react';
import { Alert, AlertTitle, AppBar, Backdrop, Box, Button, Checkbox, CircularProgress, 
  Dialog, DialogTitle, Drawer, FormControl, FormControlLabel, Grid, IconButton, InputLabel, ListItemText, 
  MenuItem, OutlinedInput, Select, Stack, TextField, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useRouter } from "next/navigation";


const List = () => {
  const [selectedApartments, setSelectedApartments] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [currentBuilding, setCurrentBuilding] = useState("");
  const [unitCosts510, setUnitCosts510] = useState([]);
  const [unitCosts1933, setUnitCosts1933] = useState([]);
  const [unitCosts, setUnitCosts] = useState([]);
  const [apartments510, setApartments510] = useState([[]]);
  const [apartments1933, setApartments1933] = useState([[]]);
  const [apartments, setApartments] = useState([[]]);
  const isAllSelected = apartments.length > 0 && selectedApartments.length === apartments.length;
  const [apartmentsDisabled, setApartmentsDisabled] = useState(true);
  const [monthsDisabled, setMonthsDisabled] = useState(true);
  const [customRangeDisabled, setCustomRangeDisabled] = useState(true);
  const [billingMonths, setBillingMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'day'));
  const [endDate, setEndDate] = useState(dayjs());
  const [dueDate, setDueDate] = useState(dayjs(startDate).add(2, 'month'))
  const unitCostDisabled = !(selectedMonth.length > 0 || isCustom == true || selectedApartments.length > 0);
  const [customWater, setCustomWater] = useState(false);
  const [validWaterText, setValidWaterText] = useState(true);
  const [waterText, setWaterText] = useState("");
  const [customElectric, setCustomElectric] = useState(false);
  const [validElectricText, setValidElectricText] = useState(true);
  const [electricText, setElectricText] = useState("");
  const [customGas, setCustomGas] = useState(false);
  const [validGasText, setValidGasText] = useState(true);
  const [gasText, setGasText] = useState("");
  const [waterAlert, setWaterAlert] = useState(false);
  const [electricAlert, setElectricAlert] = useState(false);
  const [gasAlert, setGasAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState(false);

  var backendURL = ""; //insert backend url

  //fetches information from backend api on first render
  useEffect(() => {
    try {
      fetch(backendURL + "/api/buildings")
      .then((response) => response.json())
        .then((data) => {
          setBuildings(data.map((building) => {return building[1]}));
 
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

      fetch(backendURL + "/api/billingMonths")
      .then((response) => response.json())
      .then((data) => {
        setBillingMonths(data);
      });

      //post requests to get unit costs for 510 and 1933, as 1933 has additional gas unit cost;
      //post request also stops anyone from simply putting in the fetch url and getting the unit cost info
      const requestOptions510 = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: (String(1)) })
      }; 
      fetch(backendURL + "/api/unitCosts", requestOptions510)
      .then((response) => response.json())
        .then((data) => {
          setUnitCosts510(data);
        });

      const requestOptions1933 = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: (String(2)) })
      }; 
      fetch(backendURL + "/api/unitCosts", requestOptions1933)
      .then((response) => response.json())
        .then((data) => {
          setUnitCosts1933(data);
        });
    } catch(err) {
      setFetchFailed(true);
    }
  }, []); 


  function buildingSelect(e) {
    //resets all the necessary info when changing buildings
    //to prevent generating bills with missing info
    setSelectedApartments([]);
    setApartmentsDisabled(false);
    setWaterAlert(false);
    setElectricAlert(false);
    setGasAlert(false);
    setCustomWater(false);
    setCustomElectric(false);
    setCustomGas(false);

    //sets the gas unit cost textfield when 1933 is selected
    if(unitCosts.length > 0) {
        setWaterText(unitCosts[0]);
        setElectricText(unitCosts[1]);
        if(unitCosts.length > 2) {
          setGasText(unitCosts[2]);
        }
      
    }

    //sets necessary options based on the selected building
    let currBuilding = e.target.value;
    if(currBuilding == buildings[0]) {
      setApartments(apartments510);
      setUnitCosts(unitCosts510)
      setCurrentBuilding(currBuilding);
    } else if(currBuilding == buildings[1]) {
      setApartments(apartments1933);
      setUnitCosts(unitCosts1933);
      setCurrentBuilding(currBuilding);
    }
  }


  const checkboxHandler = (event) => {
    const {
      target: { value }, 
    } = event;

    //if select all option chosen, sets the list of selected apartments to equal
    //the list of all apartments for the building to avoid having "select all" being one of
    //the selected options
    if (value[value.length - 1] === "select all") {
      setSelectedApartments(selectedApartments.length === apartments.length ? [] : apartments.map((apartment) => {
        return apartment[1]
      }));
    } else {
      setSelectedApartments(
        //On autofill we get a stringified value.
        typeof value === 'string' ? value.split(',') : value,
      );
    }

    //if apartments selected, enables the custom range components and billing month dropdown
    if (value.length > 0) {
      setMonthsDisabled(false);
      setCustomRangeDisabled(false);
    } else {
      setMonthsDisabled(true);
      setCustomRangeDisabled(true);
      setSelectedMonth("");
    }
  
  };

  //once building selected and unit costs confirmed, sets unit costs textfields
  useEffect(() => {
    setGasText(unitCosts[2]);
  },[unitCosts.length > 2])
  useEffect(() => {
    setWaterText(unitCosts[0]);
  },[unitCosts.length > 0, currentBuilding])  
  useEffect(() => {
    setElectricText(unitCosts[1]);
  },[unitCosts.length > 0, currentBuilding])


//sets selected billing month, updates date textfields to reflect the month
  function monthSelect(e) {
    setSelectedMonth(e.target.value);
    let days = firstAndLastDay(billingMonths.indexOf(e.target.value), Number(dayjs().format("YYYY")))
    setStartDate(dayjs(days[0]));
    setEndDate(dayjs(days[1]));
    setDueDate(dayjs(days[0]).add(2, 'month'));
  }


  //if custom billing range checkbox checked, disables billing months dropdown and vice versa
  function customBillingRange(e) {
    setIsCustom(e.target.checked);
    if(isCustom == true) {
      setMonthsDisabled(false);
    } else {
      setMonthsDisabled(true);
    }
  }

  //if boolean passed is true, returns sx fields to make the component invisible
  function boxChange(componentDisabled) {
    if(componentDisabled  == true) {
      return { display: { xl: 'none', lg: 'none', md: 'none', sm: 'none', xs: 'none' } }
    } else {
      return {}
    }
  }

  //validates custom unit cost textfield to ensure only numbers are entered;
  //displays alert if the new unit cost is past a reasonable limit;
  //captures new unit cost to be uploaded to database when generate preview button clicked
  function textChange(e) {
    let newText = String(e.target.value).trim()
    if(e.target.id == "water-unit-cost") {
      setWaterText(newText);
      if(isNaN(newText)) {
        setValidWaterText(false);
      } else {
        setValidWaterText(true); 
        if(Number(newText) > 0.1) {
          setWaterAlert(true);
        } else {
          setWaterAlert(false);
        }
      }
    } else if (e.target.id == "electric-unit-cost") {
      setElectricText(newText);
      if(isNaN(newText)) {
        setValidElectricText(false);
      } else {
        setValidElectricText(true);
        if(Number(newText) > 1) {
          setElectricAlert(true);
        } else {
          setElectricAlert(false);
        }
      }
      setElectricText(newText);
    } else {
      setGasText(newText);
      if(isNaN(newText)) {
        setValidGasText(false);
      } else {
        setValidGasText(true);
        if(Number(newText) > 4) {
          setGasAlert(true);
        } else {
          setGasAlert(false);
        }
      }
      setGasText(newText);
    }
   }


  //handles custom unit cost checkboxes being checked
  const handleChange = (event) => {
    var checked = event.target.checked;
    if(event.target.id == "water-unit-cost") {
      setCustomWater(checked);
      setWaterText(unitCosts[0]);
      setValidWaterText(true);
      if(checked == false) {
        setWaterAlert(checked);
      }  
    } else if (event.target.id == "electric-unit-cost") {
      setCustomElectric(event.target.checked);
      setElectricText(unitCosts[1]);
      setValidElectricText(true);  
      if(checked == false) {
        setElectricAlert(checked);
      }
    } else {
      setCustomGas(event.target.checked);
      setGasText(unitCosts[2]);
      setValidGasText(true);  
      if(checked == false) {
        setGasAlert(checked);
      }
    }
  }; 
 

  //handles generate preview button click. Checks to see if the user has changed the
  //unit costs and if so, prepares to upload the altered unit costs. Sets the start and 
  //end billing date if the user selected from the billing month dropdown, and prepares to 
  //generate the utility bill PDFs
  function generateButtonChange(e) {
    let newWaterCost = false;
    let newElectricCost = false;
    let newGasCost = false;
    if(waterText == String(unitCosts[0])) {
      setWaterText(unitCosts[0]);  
    } else {
      newWaterCost = true;
    }
    if(electricText == String(unitCosts[1])) {
      setElectricText(unitCosts[1]);
    } else {
      newElectricCost = true;
    } 
    if(gasText == String(unitCosts[2]) || currentBuilding == buildings[0]) {
      setGasText(unitCosts[2]);
    } else {
      newGasCost = true;
    }
    if(!isCustom) {
      let days = firstAndLastDay(billingMonths.indexOf(selectedMonth), Number(dayjs().format("YYYY")))
      setStartDate(dayjs(days[0]));
      setEndDate(dayjs(days[1]));
    }
    generatePDFs(newWaterCost, newElectricCost, newGasCost);
  }


  //compiles a list of items into a string separated by dashes
  function apartmentsString(items) {
    let returnString = "";
    for (let i = 0; i < items.length; i++) {
      returnString = returnString + String(items[i]);
      if(i !== items.length - 1) {
        returnString = returnString + "-";
      }
    }
    return returnString
    
  }


  //creates the fetch url to send the necessary information to the api. If fetch response received, 
  //proceeds to pdf viewer page. If not, error dialog appears and the user must restart the page
  async function generatePDFs(uploadWater, uploadElectric, uploadGas) {
    if (uploadWater == true) {
      //sets the post request options
      const waterRequestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: (String(buildings.indexOf(currentBuilding) + 1) + "," + waterText + "," + "1") })
      }; 
      try {
        await fetch(backendURL + "/api/unitCosts", waterRequestOptions)
        .then((response) => response.json())
          .then((data) => {
            console.log(data);
          });
      } catch(err) {
        setFetchFailed(true);
      }
    }
    
    if (uploadElectric == true) {
      const electricRequestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: (String(buildings.indexOf(currentBuilding) + 1) + "," + electricText + "," + "2") })
      }; 
      try {
        await fetch(backendURL + "/api/unitCosts", electricRequestOptions)
        .then((response) => response.json())
          .then((data) => {
            console.log(data);
          });
      } catch(err) {
        setFetchFailed(true);
      }
    }

    if (uploadGas == true) {
      const gasCostsRequestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: (String(buildings.indexOf(currentBuilding) + 1) + "," + gasText + "," + "3") })
      }; 
      try {
        await fetch(backendURL + "/api/unitCosts", gasCostsRequestOptions)
          .then((response) => response.json())
            .then((data) => {
              console.log(data);
            });
      } catch(err) {
        setFetchFailed(true);
      }
    }

    setLoading(true);
    let fetchURL = backendURL + "/api/GenerateBills/" + String(buildings.indexOf(currentBuilding) + 1) + "/" + startDate.format('YYYY-MM-DD') + "/" + endDate.format('YYYY-MM-DD')
    + "/" + dueDate.format('YYYY-MM-DD') + "/" + apartmentsString(selectedApartments)
    setLoading(true);
    try {
      await fetch(fetchURL)
      .then((response) => response.json())
        .then((data) => {
          router.push("/PDFs")
        });
    } catch(err) {
      setFetchFailed(true);
    }
  }


  //calculates the first and last day of a given month and year
  function firstAndLastDay(inputMonth, inputYear) {
    var firstDay = new Date(inputYear, inputMonth, 1);
    var lastDay = new Date(inputYear, inputMonth + 1, 0); 
    return [firstDay, lastDay]
  }


  function render() {
    return (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                      onClick={() => setOpenMenu(true)}
                      disabled={loading}
                      >
                      <MenuIcon />
                      </IconButton>
                  </Toolbar>
                </AppBar>
            </Box>
            <Drawer open={openMenu} anchor={"left"} onClose={() => setOpenMenu(false)}>
                <div style={{ width: 250 }} onClick={() => setOpenMenu(false)}>
                    <Button href="/" onClick={() => setLoading(true)}>Generate Preview</Button>
                    <br></br>
                    <Button href="/TenantInformation" onClick={() => setLoading(true)}>Tenant Information</Button>
                </div>
            </Drawer>
          <Grid container direction="row" justifyContent="center" alignItems="center" columns={2}
                sx={{paddingTop: "2%"}}>
            <Grid item md={1}>
              <Box>
                <FormControl sx={{paddingLeft: "4%", width: "75%"}}>
                  <FormControl sx={{paddingBottom: "5%"}}>
                    <InputLabel id="selectBuilding" style={{textAlign: "center"}} >Select Building</InputLabel>
                    <Select labelId="selectBuilding" onChange={e => buildingSelect(e)} disabled={loading}>
                      {
                        buildings.map((b, index) => {
                        return <MenuItem key={index} value={b}>{b}</MenuItem>
                        })
                      }
                    </Select>
                  </FormControl>
                  <FormControl sx={{paddingBottom: "5%"}}>
                    <InputLabel id="apartment-checkbox-label" style={{textAlign: "center"}}>Select Apartments</InputLabel>
                    <Select
                      labelId="apartment-checkbox-label"
                      multiple
                      disabled={apartmentsDisabled || loading}
                      value={selectedApartments}
                      onChange={e => checkboxHandler(e)}
                      input={<OutlinedInput label="Apartments" />}
                      renderValue={(selectedApartments) => selectedApartments.join(', ')}
                      >
                        <MenuItem value={"select all"}>
                          <Checkbox checked={isAllSelected}/>
                          <ListItemText primary={"Select All"}/>
                        </MenuItem>
                        {
                          apartments.map((apartment) => {
                            return (
                              <MenuItem key={apartment[0]} value={apartment[1]}>
                                <Checkbox checked={selectedApartments.indexOf(apartment[1]) > -1} />
                                <ListItemText primary={apartment[1]} />
                              </MenuItem>
                            )
                          })
                        } 
                    </Select>
                  </FormControl>
                  <Box>
                  <FormControl sx={{width: "100%"}}>
                      <InputLabel id="billing-month-label">Select Billing Month</InputLabel>
                      <Select
                        labelId="billing-month-label"
                        id="select-billing-month"
                        disabled={monthsDisabled || loading}
                        value={selectedMonth}
                        onChange={e => monthSelect(e)}
                        input={<OutlinedInput label="Billing Month" />}
                        >
                          {
                            billingMonths.map((month) => {
                              return (
                                <MenuItem key={month} value={month}>
                                  <ListItemText primary={month} />
                                </MenuItem>
                              )
                            })
                          } 
                      </Select>
                      <Stack direction="row" spacing={2} justifyContent="center" sx={{paddingTop: "5%"}}>
                        <FormControlLabel 
                        control={
                          <Checkbox checked={isCustom} 
                          onChange={e => customBillingRange(e)} 
                          disabled={customRangeDisabled || loading}
                          />} 
                        label="Custom Billing Range" />
                        <DatePicker
                          label="start date"
                          disableFuture
                          disabled={!isCustom || loading}
                          value={startDate}
                          maxDate={endDate}
                          onChange={(newValue) => {
                            setStartDate(newValue);
                            setDueDate(dayjs(newValue).add(2, 'month'));
                          }}
                        />
                        <DatePicker
                          label="end date"
                          disableFuture
                          disabled={!isCustom || loading}
                          value={endDate}
                          minDate={startDate}
                          onChange={(newValue) => setEndDate(newValue)}
                        /> 
                      </Stack>
                    </FormControl>
                  </Box>
                </FormControl>
              </Box>       
            </Grid>       
            <Grid item md={1}>    
            <FormControl sx={{paddingRight: "5%", width: "75%"}}>
              <Stack spacing={4} justifyContent="flex-start">
                  <Box>
                    <Stack spacing={1} justifyContent="center">
                      <label>Water Unit Cost (per gallon)</label>
                      <Stack direction="row" spacing={12} justifyContent="center">
                        <FormControlLabel 
                          control={
                            <Checkbox 
                            id="water-unit-cost"
                            checked={customWater} 
                            onChange={e => handleChange(e)} 
                            disabled={unitCostDisabled || loading}
                            />} 
                          label="Set Unit Cost" />
                          <TextField
                          onChange={e => textChange(e)}
                          disabled={!customWater || loading}
                          error={!validWaterText}
                          id="water-unit-cost"
                          label={validWaterText === true ? "" : "Error"}
                          value={waterText}
                          helperText={validWaterText === true ? "" : "Please enter a number"}
                          />
                      </Stack>
                      {waterAlert && <Alert severity="warning" >
                            <AlertTitle>Warning</AlertTitle>
                            <strong> Water unit cost higher than 0.1 </strong>
                          </Alert>}
                    </Stack>
                  </Box>
                  <Box>
                    <Stack spacing={1} justifyContent="center">
                      <>Electricity Unit Cost (per kWh)</>
                      <Stack direction="row" spacing={12} justifyContent="center" sx={{paddingTop: "2%"}}>
                        <FormControlLabel 
                          control={
                            <Checkbox 
                            id="electric-unit-cost"
                            checked={customElectric} 
                            onChange={e => handleChange(e)} 
                            disabled={unitCostDisabled || loading}
                            />} 
                          label="Set Unit Cost" />
                          <TextField
                          onChange={e => textChange(e)}
                          disabled={!customElectric || loading}
                          error={!validElectricText}
                          id="electric-unit-cost"
                          label={validElectricText === true ? "" : "Error"}
                          value={electricText}
                          helperText={validElectricText === true ? "" : "Please enter a number"}
                          />
                      </Stack>
                      {electricAlert && <Alert severity="warning">
                            <AlertTitle>Warning</AlertTitle>
                            <strong> Electricity unit cost higher than 1 </strong>
                          </Alert>}
                    </Stack>
                    </Box>
                  <Box id="gas-box" sx={boxChange(!(unitCosts.length > 2) || unitCostDisabled)}>
                    <Stack spacing={1} justifyContent="center">
                      <>Gas Unit Cost (per Therm)</>
                      <Stack direction="row" spacing={12} justifyContent="center" sx={{paddingTop: "2%"}}>
                        <FormControlLabel 
                          control={
                            <Checkbox 
                            id="gas-unit-cost"
                            checked={customGas} 
                            onChange={e => handleChange(e)} 
                            disabled={unitCostDisabled || loading}
                            />} 
                          label="Set Unit Cost" />
                          <TextField
                          onChange={e => textChange(e)}
                          disabled={!customGas || loading}
                          error={!validGasText}
                          id="gas-unit-cost"
                          label={validGasText === true ? "" : "Error"}
                          value={gasText}
                          helperText={validGasText === true ? "" : "Please enter a number"}
                          />
                      </Stack> 
                      {gasAlert && <Alert severity="warning">
                          <AlertTitle>Warning</AlertTitle>
                          <strong> Gas unit cost higher than 4 </strong>
                        </Alert>}
                    </Stack>
                  </Box>
              </Stack>
            </FormControl>
            </Grid>       
          </Grid>                  
          <Box>               
            <FormControl sx={{paddingTop:"3%", width: "15%"}}>
              <Stack spacing={2} alignItems="center"> 
                <DatePicker
                  label="due date"
                  value={dueDate}
                  minDate={endDate}
                  onChange={(newValue) => setDueDate(newValue)}
                  disabled={loading}
                /> 
                <Button
                  disabled={!(validWaterText && validElectricText && validGasText && selectedApartments.length > 0
                    && (selectedMonth.length > 0 || isCustom == true)) || loading} 
                  variant="outlined"
                  size="medium"
                  onClick={e => generateButtonChange(e)}
                >Generate Preview</Button>
              </Stack>
            </FormControl>
          </Box>
          <Dialog open={fetchFailed}>
            <DialogTitle>Error Generating Utility Bills</DialogTitle>
            <Button href = "/">Restart Page</Button>
          </Dialog>
        </div>
      </LocalizationProvider>
    )
  }
  return render();
}

export default List;
