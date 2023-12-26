export function EscapeString(str: string): string {
    return [...str].map(x => Replacer(x)).join();
}

function Replacer(symbol: string): string {
    if (symbol === '\n') {
        return '\\n';
    } else if (symbol === '\r') {
        return '\\r';
    } else {
        return symbol;
    }
}
