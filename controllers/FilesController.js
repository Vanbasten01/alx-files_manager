import dbClient from "../utils/db";
import redisClient from "../utils/redis";
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs';


export default class FilesController {
    static async postUpload(req, res) {
        const key = req.header('X-Token');
    const session = await redisClient.get(`auth_${key}`);
    if (!key || key.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (session) {
      const { name } = req.body;
      const { type } = req.body;
      let { parentId } = req.body;
      const { isPublic } = req.body;
      const { data } = req.body;
      const types = ['folder', 'file', 'image'];

      if (!name) {
        return (res.status(400).json({ error: 'Missing name' }));
      } if ((!type) || types.includes(type) === false) {
        return (res.status(400).json({ error: 'Missing type' }));
      }

      if (!data && type !== types[0]) {
        return (res.status(400).json({ error: 'Missing data' }));
      }
      if (!parentId) { parentId = 0; }
      if (parentId !== 0) {
        const search = await dbClient.db.collection('files').find({ _id: ObjectId(parentId) }).toArray();
        if (search.length < 1) {
          return (res.status(400).json({ error: 'Parent not found' }));
        }
        if (types[0] !== search[0].type) {
          return (res.status(400).json({ error: 'Parent is not a folder' }));
        }
      }
      const userId = session;
      if (type === types[0]) {
        const folder = await dbClient.db.collection('files').insertOne({
          name,
          type,
          userId: ObjectId(userId),
          parentId: parentId !== 0 ? ObjectId(parentId) : 0,
          isPublic: isPublic || false,
        });
        return res.status(201).json({
          id: folder.ops[0]._id,
          userId: folder.ops[0].userId,
          name: folder.ops[0].name,
          type: folder.ops[0].type,
          isPublic: folder.ops[0].isPublic,
          parentId: folder.ops[0].parentId,
        });
      }

      const buff = Buffer.from(data, 'base64').toString('utf-8');
      const path = process.env.FOLDER_PATH || '/tmp/files_manager';
      const newFile = uuidv4();

      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
      fs.writeFile(`${path}/${newFile}`, buff, (err) => {
        if (err) {
          return (res.status(400).json({ error: err.message }));
        }
        return true;
      });
      const file = await dbClient.db.collection('files').insertOne({
        name,
        type,
        userId: ObjectId(userId),
        parentId: parentId !== 0 ? ObjectId(parentId) : 0,
        isPublic: isPublic || false,
        data,
        localPath: `${path}/${newFile}`,
      });

      return res.status(201).json({
        id: file.ops[0]._id,
        userId: file.ops[0].userId,
        name: file.ops[0].name,
        type: file.ops[0].type,
        isPublic: file.ops[0].isPublic,
        parentId: file.ops[0].parentId,
      });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

    static async getShow(req, res) {
        try {
            const token = req.header('x-token');
            if (!token) return res.status(401).json({ error: 'Unauthorized' });

            const userId = await redisClient.get(`auth_${token}`);
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const fileId = req.params.id;
        
            const filesCollection = await dbClient.db.collection('files');
            const file = await filesCollection.findOne({ _id: ObjectId(fileId), userId: userId });
            if (!file) return res.status(404).json({ error: 'Not found' });
            // Exclude localPath from the response
            delete file.localPath;
            const { _id, ...fileData } = file;
            const responseFile = { id: _id, ...fileData };

            return res.json(responseFile);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getIndex(req, res) {
        try {
            const token = req.header('x-token');
            if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
            const userId = await redisClient.get(`auth_${token}`);
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
            const parentId = req.query.parentId || '0'; // Retrieve parentId from query parameters
            const page = parseInt(req.query.page, 10) || 0;
            const limit = 20;
            const skip = page * limit;
    
            const filesCollection = dbClient.db.collection('files');
            
            // Check if parentId is provided in the query parameters
            if (!req.query.parentId) {
                const files = await filesCollection.find({ userId: userId })
                                                    .skip(skip)
                                                    .limit(limit)
                                                    .toArray();
                // Rename _id to id and exclude localPath
                const responseFiles = files.map(file => {
                delete file.localPath;
                const { _id, parentId, ...fileData } = file;
                return { id: _id, parentId: parentId === '0' ? 0 : parentId, ...fileData };
            });
                return res.json(responseFiles);
            }
    
            // If parentId is provided, return files associated with userId and parentId
            const files = await filesCollection.find({ userId: userId, parentId: parentId })
                                                .skip(skip)
                                                .limit(limit)
                                                .toArray();
            const responseFiles = files.map(file => {
                delete file.localPath;
                const { _id,parentId, ...fileData} = file;
                return { id: _id, parentId: parentId === "0" ? 0 : parentId, ...fileData };
            })
            return res.json(responseFiles);
    
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    
}
