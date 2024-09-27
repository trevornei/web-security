import { createServer, startServer } from '#shared';
import { readFile } from 'fs/promises';
import cookieParser from 'cookie-parser';

import db from './database.js';

const app = createServer({ cookies: false });
app.use(cookieParser());

app.get('/', (req, res) => {
  if (!req.cookies) res.send('Cookies are disabled.');
  if (req.cookies.username) {
    res.redirect('/profile');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', async (req, res) => {
  const loginPage = await readFile('./pages/login.html', 'utf-8');

  if (req.cookies.username) {
    res.redirect('/profile');
  }

  if (req.query.error) {
    res
      .status(403)
      .send(loginPage.replace('{{error}}', String(req.query.error)));
    return;
  }

  res.send(loginPage);
});

// Simulate user login and set a cookie
app.post('/login', async (req, res) => {
  // .post() method is used in Express.js to make a post request to the sever.
  // async is a handler function: requires an 'await' statement.
  // .post(x, async (req, res) => {
  //  req: is the request from the client to the server
  // .      req contains: http || https: information, headers, cookies, etc.
  //  res: is the response from the server back to the client.
  // .      res will return: data, status codes, cookies, redirects...
  //})
  const { username, password } = req.body;

  const user = await db.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password]
  );

  if (user) {
    // We are going to set various attributes on this login... Such as http: only.
    res.cookie('username', username, {
      httpOnly: true,
    });
    res.redirect('/profile');
  } else {
    res.status(403).redirect('/login?error=Invalid login credentials.');
  }
});

app.post('/logout', (_, res) => {
  res.clearCookie('username');
  res.redirect('/login');
});

// Display user profile only if the username cookie exists
app.get('/profile', async (req, res) => {
  res.locals.title = 'Profile';

  const username = req.cookies.username;

  if (!username) {
    return res.redirect('/login?error=Please login to view your profile.');
  }

  const user = await db.get('SELECT * FROM users WHERE username = ?', username);

  if (user && user.username) {
    res.send(
      (await readFile('./pages/profile.html', 'utf-8')).replace(
        '{{username}}',
        user.username
      )
    );
  } else {
    return res.redirect('/login?error=Please login to view your profile.');
  }
});

startServer(app, { name: 'Cookie Jar' });
