// render HTMLEntity as icon instead of string
export function decodeHTMLEntity(encodedStr: string) {
  // prevent string to be html tag to avoid the need of sanitize the string
  if (encodedStr[0] !== '&' && encodedStr.slice(-1)[0] !== ';') return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(encodedStr, 'text/html');
  return doc.documentElement.textContent ?? '';
}
