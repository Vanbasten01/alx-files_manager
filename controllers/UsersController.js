/* eslint-disable import/no-named-as-default */
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const collection = dbClient.db.collection('users');
    const userExists = await collection.findOne({ email });

    if (userExists) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const newUser = {
      email,
      password: hashedPassword,
    };

    try {
      const { insertedId } = await collection.insertOne(newUser);
      const user = {
        id: insertedId,
        email,
      };
      return res.status(201).json(user);
    } catch (error) {
      console.error('Error creating new user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const userId = await redisClient.get(`auth_${token}`);
      // Retrieve the user object from your data storage (e.g., database)
      const users = dbClient.db.collection('users');
      const user = await users.findOne({ _id: ObjectId(userId) });
      // If the user is not found, return an error
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // Return the user object (email and id only)
      return res.status(200).json({ email: user.email, id: user._id });
    } catch (error) {
      console.error('Error retreiving user', error);
      return res.status(500).json({ error: 'Interal Server Error' });
    }
  }
}

export default UsersController;
