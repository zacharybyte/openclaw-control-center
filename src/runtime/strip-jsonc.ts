/**
 * Strip single-line (//) and block (/* *\/) comments from a JSONC string,
 * returning valid JSON that can be passed to JSON.parse.
 */
export function stripJsoncComments(input: string): string {
  let result = "";
  let i = 0;
  let inString = false;
  while (i < input.length) {
    const ch = input[i];
    if (inString) {
      result += ch;
      if (ch === "\\" && i + 1 < input.length) {
        i++;
        result += input[i];
      } else if (ch === '"') {
        inString = false;
      }
      i++;
    } else if (ch === '"') {
      inString = true;
      result += ch;
      i++;
    } else if (ch === "/" && input[i + 1] === "/") {
      while (i < input.length && input[i] !== "\n") i++;
    } else if (ch === "/" && input[i + 1] === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i++;
      i += 2;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}
