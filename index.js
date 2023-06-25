const express = require('express');
const cors = require('cors')
const app = express();
const port = 3000;


app.use(cors());
app.use(express.json());

// Array to store HWIDs
const hwidArray = [];
const whitelistedArray = [];
const blacklistedArray = [];

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
  console.log(`Got a hwid of:  ${hwid}`)
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
    const blacklistIndex = blacklistedArray.indexOf(hwid);
    if (blacklistIndex > -1) {
      blacklistedArray.splice(blacklistIndex, 1);
    }

    // Add the HWID to the whitelist if it's not already whitelisted
    if (!whitelistedArray.includes(hwid)) {
      whitelistedArray.push(hwid);
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
    const whitelistIndex = whitelistedArray.indexOf(hwid);
    if (whitelistIndex > -1) {
      whitelistedArray.splice(whitelistIndex, 1);
    }

    // Add the HWID to the blacklist if it's not already blacklisted
    if (!blacklistedArray.includes(hwid)) {
      blacklistedArray.push(hwid);
    }

    res.json({ message: 'HWID blacklisted successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID not found.' });
  }
});

// Route to check if a HWID is whitelisted or blacklisted
app.get('/api/hwids/check/*hwid', (req, res) => {
  const hwid = req.params.hwid;

  if (hwid) {
    if (whitelistedArray.includes(hwid)) {
      res.json({ state: 'whitelisted' });
    } else if (blacklistedArray.includes(hwid)) {
      res.json({ state: 'blacklisted' });
    } else {
      res.json({ state: 'not_found' });
    }
  } else {
    res.status(400).json({ error: 'Invalid HWID.' });
  }
});


app.get("/", (req, res) => {
  res.redirect('/api/version');
});

// Start the server
app.listen(port, () => {
  console.log(`Luminous API is running on http://localhost:${port}`);
});
