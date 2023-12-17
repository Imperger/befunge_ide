export function EscapeString(str: string): string {
    return [...str].map(x => Replacer(x)).join();
}

function Replacer(symbol: string): string {
    if (symbol === '\n') {
        return '\\n';
    } else {
        return symbol;
    }
}
