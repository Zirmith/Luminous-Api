const express = require('express');
const app = express();
const port = 3000;

// Array to store HWIDs
const hwidArray = [];


// Define a route for checking the Luminous API version
app.get('/api/version', (req, res) => {
    // Simulate the version retrieval
    const version = '1.0.0';
  
    res.json({ version });
  });
  

// Route to get all HWIDs
app.get('/api/hwids', (req, res) => {
  res.json({ hwids: hwidArray });
});

// Route to add a new HWID
app.post('/api/hwids', (req, res) => {
  const { hwid } = req.body;

  if (hwid && !hwidArray.includes(hwid)) {
    hwidArray.push(hwid);
    res.json({ message: 'HWID added successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID already exists.' });
  }
});

// Route to whitelist a HWID
app.put('/api/hwids/whitelist', (req, res) => {
  const { hwid } = req.body;

  if (hwid && hwidArray.includes(hwid)) {
    // Remove the HWID from the array if it's already blacklisted
    const index = hwidArray.indexOf(hwid);
    if (index > -1) {
      hwidArray.splice(index, 1);
    }

    res.json({ message: 'HWID whitelisted successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID not found.' });
  }
});

// Route to blacklist a HWID
app.put('/api/hwids/blacklist', (req, res) => {
  const { hwid } = req.body;

  if (hwid && hwidArray.includes(hwid)) {
    // Remove the HWID from the array if it's already whitelisted
    const index = hwidArray.indexOf(hwid);
    if (index > -1) {
      hwidArray.splice(index, 1);
    }

    res.json({ message: 'HWID blacklisted successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID not found.' });
  }
});


app.get("/", (req, res) => {
    res.redirect('/api/version');
})

// Start the server
app.listen(port, () => {
  console.log(`Luminous API is running on http://localhost:${port}`);
});
