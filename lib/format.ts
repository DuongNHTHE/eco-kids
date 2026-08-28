const Format = {
    price: (value: number | string | undefined): string => {
        if (value === null || value === undefined || value === '') return "";
        const intPart = Math.floor(Number(value) || 0);
        return intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    },
    money(value: number | string | undefined): string {
        return Format.price(value);
    },
    title: (value?: string): string => {
        if (!value) return "";
        return value
            .toLocaleLowerCase('vi')
            .split(' ')
            .map(word =>
                word.charAt(0).toLocaleUpperCase('vi') + word.slice(1)
            )
            .join(' ');
    },
    date: (value: string | Date | undefined): string => {
        if (!value) return "";
        const date = value instanceof Date ? value : new Date(value);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },
    dateSlashDM: (value: string | Date | undefined): string => {
        if (!value) return "";
        const date = value instanceof Date ? value : new Date(value);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}`;
    },
    dateDM: (value: string | Date | undefined): string => {
        if (!value) return "";
        const date = value instanceof Date ? value : new Date(value);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },
    dateYMD: (value: string | Date | undefined): string => {
        if (!value) return "";
        const date = value instanceof Date ? value : new Date(value);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    },
    dateOfWeek: (value: string | Date | undefined): string => {
        if (!value) return "";
        const date = value instanceof Date ? value : new Date(value);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const weekday = weekdays[date.getDay()];
        return `${day}/${month}/${year} (${weekday})`;
    },
    datetime: (value: string | undefined): string => {
        if (!value) return "";
        const date = new Date(value);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    },
    minute: (value: number): string => {
        const hours = Math.floor(value / 60);
        const minutes = value % 60;

        const parts: string[] = [];
        if (hours) parts.push(`${hours}h`);
        if (minutes || parts.length === 0) parts.push(`${minutes}m`);

        return parts.join(' ');
    },
    normalize: (value: string | undefined): string => {
        if (!value) return "";
        // Normalize the string by removing accents and converting to lowercase
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    },
    double: (value: number | string | undefined, n: number = 2, trimInt = false): string => {
        if (value === null || value === undefined || value === '') return '';
        const num = Number(value);
        if (isNaN(num)) return '';
        const str = num.toFixed(n);
        return trimInt && Number.isInteger(num) ? num.toString() : str;
    },    // alias for money/price with currency parameter (default to VND)
    currency: (value: number | string | undefined, currency: string = 'VND'): string => {
        // For now, simply format value and append currency symbol if necessary
        const formatted = Format.money(value);
        return formatted + (currency ? ` ${currency}` : '');
    },
};

export default Format;