
/* eslint-disable import/no-named-as-default */
/* eslint-disable import/no-unresolved */
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static async getStatus(req, res) {
    const redisAlive = await redisClient.isAlive();
    const dbAlive = await dbClient.isAlive();
    const status = {
      redis: redisAlive,
      db: dbAlive,
    };
    return res.status(200).json(status);
  }

  static async getStats(req, res) {
    try {
      const nbUsers = await dbClient.nbUsers();
      const nbFiles = await dbClient.nbFiles();
      const stats = {
        users: nbUsers,
        files: nbFiles,
      };
      return res.status(200).json(stats);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AppController;
