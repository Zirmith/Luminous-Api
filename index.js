const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Array to store HWIDs
const hwidArray = [];
const whitelistedArray = [];
const blacklistedArray = [];

// Define a route for checking the Luminous API version
app.get('/api/version', (req, res) => {
  // Simulate the version retrieval
  const version = '1.2.0';

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
    const blacklistIndex = blacklistedArray.findIndex(item => item.hwid === hwid);
    if (blacklistIndex > -1) {
      blacklistedArray.splice(blacklistIndex, 1);
    }

    // Add the HWID to the whitelist if it's not already whitelisted
    const whitelistIndex = whitelistedArray.findIndex(item => item.hwid === hwid);
    if (whitelistIndex === -1) {
      whitelistedArray.push({ hwid });
    }

    res.json({ message: 'HWID whitelisted successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID not found.' });
  }
});

// Route to blacklist a HWID
// Route to blacklist a HWID with reason, custom code, and staff name
app.put('/api/hwids/blacklist', (req, res) => {
  const { hwid, reason, customCode, staffName } = req.body;

  if (hwid && hwidArray.includes(hwid)) {
    // Remove the HWID from the array if it's already whitelisted
    const whitelistIndex = whitelistedArray.indexOf(hwid);
    if (whitelistIndex > -1) {
      whitelistedArray.splice(whitelistIndex, 1);
    }

    // Add the HWID to the blacklist with reason, custom code, and staff name
    if (!blacklistedArray.some(item => item.hwid === hwid)) {
      blacklistedArray.push({ hwid, reason, customCode, staffName });
    }

    res.json({ message: 'HWID blacklisted successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID not found.' });
  }
});



// Route to check if a HWID is whitelisted or blacklisted

app.get('/api/hwids/check', (req, res) => {
  const hwid = req.query.hwid;

  console.log('Received HWID:', hwid);

  if (hwid) {
    if (whitelistedArray.some(item => item.hwid === hwid)) {
      const whitelistItem = whitelistedArray.find(item => item.hwid === hwid);
      console.log('HWID found in whitelist:', hwid);
      res.json({ state: 'whitelisted', reason: whitelistItem.reason, customCode: whitelistItem.customCode, staffName: whitelistItem.staffName });
    } else if (blacklistedArray.some(item => item.hwid === hwid)) {
      const blacklistItem = blacklistedArray.find(item => item.hwid === hwid);
      console.log('HWID found in blacklist:', hwid);
      const response = { state: 'blacklisted' };
      if (blacklistItem.reason) response.reason = blacklistItem.reason;
      if (blacklistItem.customCode) response.customCode = blacklistItem.customCode;
      if (blacklistItem.staffName) response.staffName = blacklistItem.staffName;
      res.json(response);
    } else {
      console.log('HWID not found:', hwid);
      res.json({ state: 'not_found' });
    }
  } else {
    console.log('Invalid HWID');
    res.status(400).json({ error: 'Invalid HWID.' });
  }
});




// Route to delete an HWID
app.delete('/api/hwids/:hwid', (req, res) => {
  const hwid = req.params.hwid;

  if (hwid && hwidArray.includes(hwid)) {
    const index = hwidArray.indexOf(hwid);
    hwidArray.splice(index, 1);
    res.json({ message: 'HWID deleted successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID not found.' });
  }
});

app.get("/", (req, res) => {
  res.redirect('/api/version');
});

// Start the server
app.listen(port, () => {
  console.log(`Luminous API is running on http://localhost:${port}`);
});
