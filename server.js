import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// 1. Define your target directory path
const uploadDirectory = path.join(__dirname, 'FileStorage', 'ESTIMATION');

// 3. Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDirectory)) {
            fs.mkdirSync(uploadDirectory, { recursive: true });
        }
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        // Appending a timestamp prevents overwriting files with the same name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// 4. Set up a file filter to accept Word files AND PDF files
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/pdf' // .pdf
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only Word documents (.doc, .docx) and PDFs (.pdf) are allowed.'), false);
    }
};

// 5. Initialize the upload middleware
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter 
});

const router = express.Router();

router.post('/estimationFile', (req, res, next) => {
    upload.single('estimationDoc')(req, res, (err) => {
        if (err) {
            if (err.name === 'MulterError' || err instanceof multer.MulterError) {
                return res.status(400).json({ error: 'Multer error: ' + err.message });
            }
            return res.status(400).json({ error: 'Upload error: ' + err.message });
        }
        next();
    });
}, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file was uploaded or file type is invalid.' });
    }

    // Success response
    return res.status(200).json({
        message: 'File uploaded successfully!',
        filePath: req.file.path,
        fileName: req.file.filename
    });
});

// Mount the router under /service/estimation/post/upload
app.use('/service/estimation/post/upload', router);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Estimation backend API running on http://localhost:${PORT}`);
});
