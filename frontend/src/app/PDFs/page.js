'use client';
import {Stack, Backdrop, Button, CircularProgress, FormControl, Dialog, DialogTitle, DialogContent, DialogContentText } from "@mui/material";
import { useState } from "react";
 

const PDFViewer = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const backendURL = ""; //insert backend url


  function saveBillsButtonChange() {
    setLoading(true);
    openSaveDialog();
  }

  async function openSaveDialog() {
    setOpenDialog(await getDir());
    setLoading(false);
  }

  //opens up directorypicker window so the user can choose where to save the zip file containing the utility bills
  async function getDir() {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const newFileHandle = await dirHandle.getFileHandle('bills.zip', { create: true });
      await writeURLToFile(newFileHandle, backendURL + "/api/SaveBills");
      return true;
    } catch(err) {
      return false;
    }
  }
  
  async function writeURLToFile(fileHandle, url) {
    // Create a FileSystemWritableFileStream to write to.
    const writable = await fileHandle.createWritable();
    // Make an HTTP request for the contents.
    const response = await fetch(url);
    // Stream the response into the file.
    await response.body.pipeTo(writable);
    // pipeTo() closes the destination pipe by default, no need to close it.
  }

  function emailButtonChange() {
      setOpenEmailDialog(true);
      fetch(backendURL + "/api/EmailBills");
  }

  return (  
    <div>
        <Backdrop open={loading}>
          <CircularProgress sx={{color: 'white'}}/>
        </Backdrop>
        <iframe
            src={backendURL + "/api/AllBills"}
            height="100%"
            width="100%"
            style={{display: "block", height: "90vh", width: "100vw", border: "none"}}
        >
        </iframe>
        <br></br>
        <FormControl sx={{width: "30%"} }>
          <Stack direction="row" spacing={6} justifyContent="center">
            <Button href="/" variant="contained" color="primary" disabled={false} size="medium">
              Start Over 
            </Button>        
            <Button variant="contained" color="primary" onClick={saveBillsButtonChange} size="medium">
              Save Files and Email Bills
            </Button> 
          </Stack>
        </FormControl>
        <Dialog open={openDialog}>
          <DialogTitle>Files saved.</DialogTitle>
          <DialogContent>
            <DialogContentText>Would you like to email the utility bills out?</DialogContentText>
          </DialogContent>
          <Stack direction="row" spacing={6} justifyContent="center">
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={emailButtonChange}>Email Bills</Button>
          </Stack>
        </Dialog>
        <Dialog open={openEmailDialog}>
          <DialogTitle>Utility bills emailed!</DialogTitle>
          <Button href = "/">Back to Main Page</Button>
        </Dialog>
    </div>  
  )
}

export default PDFViewer;