import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import sha1 from 'sha1';

export default class AuthController {
  static async getConnect(req, res) {
    console.log(req.headers);

    // Extract email and password from the Authorization header
    const authHeader = req.headers['authorization'];
    console.log(authHeader)
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const encodedCredentials = authHeader.split(' ')[1];
    console.log(`${encodedCredentials} fromm encoded`)
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString();
    const [email, password] = decodedCredentials.split(':');
    console.log(`${email}: ${password}`)

    // Find the user associated with the email and password
    const users = dbClient.db.collection('users');
    const password1 = sha1(password);

    const user = await users.findOne({ "email": email, "password": password1 });

    console.log(`${user.email} from user`)
  

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a random token using uuidv4
    const token = uuidv4();

    // Store the user ID in Redis with the generated token as the key for 24 hours
    console.log(`${user._id.toString()} here we gooo redis`)
    await redisClient.set(`auth_${token}`, user._id.toString(), 86400)
   

    // Return the token in the response
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    // Extract the token from the request headers
    const token = req.headers['x-token'];

    // If the token is missing or invalid, return an error
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the user ID associated with the token from Redis
    const userId = await redisClient.get(`auth_${token}`);

    // If the user ID is not found or invalid, return an error
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete the token from Redis
    await redisClient.del(`auth_${token}`);

    // Return nothing with a status code 204
    return res.status(204).send();
  }
}
