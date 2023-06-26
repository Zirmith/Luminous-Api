const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, query, validationResult } = require('express-validator');
const xss = require('xss');

const app = express();
const port = 3000;

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// Apply rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Array to store HWIDs
const hwidArray = [];
const whitelistedArray = [];
const blacklistedArray = [];
const hwidAddedTimes = {};

// Define a route for checking the Luminous API version
app.get('/api/version', (req, res) => {
  // Simulate the version retrieval
  const version = '1.2.2';

  res.json({ version });
});

// Route to get all HWIDs
app.get('/api/hwids', (req, res) => {
  res.json({ hwids: hwidArray });
});

// Route to add a new HWID
app.post('/api/hwids', [
  body('hwid').notEmpty().isString().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const hwid = xss(req.body.hwid);

  if (hwid && !hwidArray.includes(hwid)) {
    hwidArray.push(hwid);
    hwidAddedTimes[hwid] = Date.now();
    res.json({ message: 'HWID added successfully.' });

    // Automatically whitelist the HWID after 5 minutes
    setTimeout(() => {
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

      console.log(`HWID ${hwid} whitelisted automatically after 5 minutes.`);
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID already exists.' });
  }
});

// Route to whitelist a HWID
app.put('/api/hwids/whitelist', [
  body('hwid').notEmpty().isString().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const hwid = xss(req.body.hwid);

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
app.put('/api/hwids/blacklist', [
  body('hwid').notEmpty().isString().trim(),
  body('reason').optional().isString().trim(),
  body('customCode').optional().isString().trim(),
  body('staffName').optional().isString().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const hwid = xss(req.body.hwid);
  const reason = xss(req.body.reason);
  const customCode = xss(req.body.customCode);
  const staffName = xss(req.body.staffName);

  if (hwid && hwidArray.includes(hwid)) {
    // Remove the HWID from the array if it's already whitelisted
    const whitelistIndex = whitelistedArray.findIndex(item => item.hwid === hwid);
    if (whitelistIndex > -1) {
      whitelistedArray.splice(whitelistIndex, 1);
    }

    // Add the HWID to the blacklist with reason, custom code, and staff name
    const blacklistIndex = blacklistedArray.findIndex(item => item.hwid === hwid);
    if (blacklistIndex === -1) {
      blacklistedArray.push({ hwid, reason, customCode, staffName });
    }

    res.json({ message: 'HWID blacklisted successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID not found.' });
  }
});

// Route to check if a HWID is whitelisted or blacklisted
app.get('/api/hwids/check', [
  query('hwid').notEmpty().isString().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const hwid = xss(req.query.hwid);

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

      // Calculate the remaining time until whitelisting
      const addedTime = hwidAddedTimes[hwid];
      if (addedTime) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - addedTime;
        const remainingTime = 5 * 60 * 1000 - elapsedTime; // 5 minutes in milliseconds

        // Convert remaining time to minutes and seconds
        const remainingMinutes = Math.floor(remainingTime / 60000);
        const remainingSeconds = Math.floor((remainingTime % 60000) / 1000);

        res.json({
          state: 'not_found',
          remainingTime: `${remainingMinutes} minutes ${remainingSeconds} seconds`,
        });
      } else {
        res.json({ state: 'not_found', remainingTime: 'Unknown' });
      }
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

    // Remove the HWID from the whitelist if it's whitelisted
    const whitelistIndex = whitelistedArray.findIndex(item => item.hwid === hwid);
    if (whitelistIndex > -1) {
      whitelistedArray.splice(whitelistIndex, 1);
    }

    delete hwidAddedTimes[hwid];
    res.json({ message: 'HWID deleted successfully.' });
  } else {
    res.status(400).json({ error: 'Invalid HWID or HWID not found.' });
  }
});


app.get('/', (req, res) => {
  res.redirect('/api/version');
});

// Start the server
app.listen(port, () => {
  console.log(`Luminous API is running on http://localhost:${port}`);
});
