/** - Možné stavy dotazů. */
export enum ELoadStatus {
    /** - Dotaz probíhá. */
    Pending = 'pending',
    /** - Při datazu nastala chyba. */
    Error = 'error',
    /** - Dotaz proběhl úspěšně. */
    Loaded = "loaded"
}

export default ELoadStatus;