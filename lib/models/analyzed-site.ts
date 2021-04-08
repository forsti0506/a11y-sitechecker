export interface AnalyzedSite {
    _id: string;
    url: string;
    filesByDate: FilesByDate[];
}

export interface FilesByDate {
    date: Date;
    files: string[];
}
