import express from 'express';
import { ensureImgDir } from './services/imageStorage.js';
import { uploadErrorHandler } from './middleware/upload.js';
import { Productrouter } from "./routes/productsRouter.js";
import { imageRouter } from './routes/imageRouter.js';
import { Userrouter } from './routes/userRouter.js';
import { Receiptrouter } from './routes/receiptRouter.js';
import { runAllDiags } from './diagnostics/index.js';

const app = express();
const PORT = 3000;

// for image assets.
app.use('/assets', express.static('assets'));

// for testing html pages.
app.use(express.static('./'));

app.use(express.json());

app.use('/api/products', Productrouter);
app.use('/api/products', imageRouter);   // image routes live under /api/products/:id/images
app.use('/api/users', Userrouter);
app.use('/api/receipts', Receiptrouter);

// Error handler LAST — must come after all routes.
app.use(uploadErrorHandler);

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  await ensureImgDir();
  await runAllDiags();
});