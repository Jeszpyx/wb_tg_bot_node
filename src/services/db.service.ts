import {join} from "node:path";
import * as fs from "node:fs";
import {readFile, writeFile} from 'fs/promises';
import {TProduct} from "../types";

class DbService {
    readonly pdfPath: string = join(process.cwd(), 'resources')
    readonly outputPath: string = join(process.cwd(), 'output')
    private readonly dbPath: string = join(process.cwd(), 'db.json')

    constructor() {
        try {
            // Создаем папку для PDF
            if (!fs.existsSync(this.pdfPath)) {
                fs.mkdirSync(this.pdfPath, {recursive: true});
                console.log(`Directory created: ${this.pdfPath}`);
            }

            if (!fs.existsSync(this.outputPath)) {
                fs.mkdirSync(this.outputPath, {recursive: true});
                console.log(`Directory created: ${this.outputPath}`);
            }

            // Создаем файл базы данных
            if (!fs.existsSync(this.dbPath)) {
                fs.writeFileSync(this.dbPath, JSON.stringify([], null, 2), {encoding: "utf8"});
                console.log(`Database file created: ${this.dbPath}`);
            }
        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    }

    private async getJsonData(): Promise<TProduct[]> {
        const fileData = await readFile(this.dbPath, 'utf-8');
        return JSON.parse(fileData) as TProduct[];
    }

    private async saveJsonData(data: TProduct[]): Promise<void> {
        return writeFile(this.dbPath, JSON.stringify(data, null, 2), {encoding: "utf8"});
    }

    public async findOneByArticle(article: string): Promise<TProduct | null> {
        try {
            const jsonData = await this.getJsonData();
            const product = jsonData.find(p => p.article === article);
            if (!product) return null;
            return product
        } catch (e) {
            console.log(`${DbService.name} => ${this.findOneByArticle.name} => error:\n${e}`)
            return null
        }
    }

    public async getAllTitles(): Promise<{ title: string }[]> {
        try {
            const jsonData = await this.getJsonData();
            return jsonData.map(p => ({
                title: p.article
            }))
        } catch (e) {
            console.log(`${DbService.name} => ${this.findOneByArticle.name} => error:\n${e}`)
            return []
        }
    }

    public async save(article: string, fileBuffer: Buffer<ArrayBuffer>): Promise<boolean> {
        try {
            const fileName = `${article}.pdf`
            const filePath = join(this.pdfPath, fileName);
            await writeFile(filePath, fileBuffer);
            const newProductData: TProduct = {
                article,
                pdfPath: fileName
            }
            const jsonData = await this.getJsonData();
            const newArray = jsonData.some((item: TProduct) => item.article === newProductData.article)
                ? jsonData.map(item => item.article === newProductData.article ? newProductData : item) // Замена
                : [...jsonData, newProductData];
            await this.saveJsonData(newArray);
            return true
        } catch (e) {
            console.log(`${DbService.name} => ${this.save.name} => error:\n${e}`)
            return false;
        }
    }
}

export const dbService = new DbService()