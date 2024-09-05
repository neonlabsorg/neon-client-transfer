export const stringShort = (data?: string, len = 30): string | void => {
    const half = Math.round(len / 2);

    if (data) {
        return `${data.slice(0, half)}..${data.slice(-half)}`;
    }
}