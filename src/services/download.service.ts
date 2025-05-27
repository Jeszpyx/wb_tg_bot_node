import {BOT_TOKEN} from "../constants";


class DownloadService {
    private readonly apiUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

    public async download(filePath: string): Promise<Buffer<ArrayBuffer> | null> {
        try {
            const response = await fetch(`${this.apiUrl}/${filePath}`, {});

            if (!response.ok) {
                return null;
            }

            const arrayBuffer = await response.arrayBuffer()

            return Buffer.from(arrayBuffer);
        } catch (e) {
            console.log(`${DownloadService.name} => ${this.download.name} => error: ${e}`)
            return null;
        }
    }
}

export const downloadService = new DownloadService();