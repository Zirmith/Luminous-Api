const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fetch = require('fetch');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Create a proxy middleware to forward requests to UptimeRobot
const proxyOptions = {
  target: 'https://stats.uptimerobot.com/jWD0pilnPj',
  changeOrigin: true,
};


// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max requests per window
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
app.post('/api/hwids', (req, res) => {
  const { hwid } = req.body;

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

      // Send the HWID and status to the backup API
      // Replace the API_URL with the actual URL of your backup API
      const backupApiUrl = 'https://luminous-backups.onrender.com/backups';
      const backupApiOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hwid, status: true }), // Assuming status is set to true for whitelisted HWIDs
      };

      fetch(backupApiUrl, backupApiOptions)
        .then(response => response.json())
        .then(data => {
          // Handle the response from the backup API if necessary
        })
        .catch(error => {
          console.error('Error sending data to backup API:', error);
        });
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
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
app.put('/api/hwids/blacklist', (req, res) => {
  const { hwid, reason, customCode, staffName } = req.body;

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
  res.redirect('/api/status');
});

const uptimeRobotProxy = createProxyMiddleware(proxyOptions);


app.post('/api/backups', (req, res) => {
  const { hwid, status } = req.body;

  if (hwid && typeof status === 'boolean') {
    // Send the HWID and status to the backup API
    // Replace the API_URL with the actual URL of your backup API
    const backupApiUrl = 'https://luminous-backups.onrender.com/backups';
    const backupApiOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hwid, status }),
    };

    fetch(backupApiUrl, backupApiOptions)
      .then(response => response.json())
      .then(data => {
        if (data.found) {
          // HWID found in the backup API
          res.json({ message: 'HWID found in backup API.' });
        } else {
          // HWID not found in the backup API
          // Add the HWID to the hwidArray and determine if it should be whitelisted or blacklisted
          if (!hwidArray.includes(hwid)) {
            hwidArray.push(hwid);
            hwidAddedTimes[hwid] = Date.now();
          }
          
          if (status) {
            // Whitelist the HWID
            const whitelistIndex = whitelistedArray.findIndex(item => item.hwid === hwid);
            if (whitelistIndex === -1) {
              whitelistedArray.push({ hwid });
            }
            res.json({ message: 'HWID added and whitelisted successfully.' });
          } else {
            // Blacklist the HWID
            const blacklistIndex = blacklistedArray.findIndex(item => item.hwid === hwid);
            if (blacklistIndex === -1) {
              blacklistedArray.push({ hwid });
            }
            res.json({ message: 'HWID added and blacklisted successfully.' });
          }
        }
      })
      .catch(error => {
        console.error('Error sending data to backup API:', error);
        res.status(500).json({ error: 'Internal server error.' });
      });
  } else {
    res.status(400).json({ error: 'Invalid HWID or status.' });
  }
});


// Define a GET route for '/api/status' that proxies the request to UptimeRobot
app.get('/api/status', (req, res) => {
 uptimeRobotProxy(req, res);
 res.redirect('https://stats.uptimerobot.com/jWD0pilnPj');
});
// Start the server
app.listen(port, () => {
  console.log(`Luminous API is running on http://localhost:${port}`);
});
