const express = require('express');
const UserService = require('../user/UserService');

const router = express.Router();

router.post('/api/1.0/auth', async (req, res) => {
  const { email } = req.body;
  const user = await UserService.findByEmail(email);

  res.send({ id: user.id, username: user.username });
});

module.exports = router;
