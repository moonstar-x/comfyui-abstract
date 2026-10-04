import { ComfyApi } from '@saintno/comfyui-sdk';
import { COMFYUI_URL } from '../../config/environment.js';

export const createComfyUiClient = (): ComfyApi => new ComfyApi(COMFYUI_URL);
