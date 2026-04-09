import { greet } from './utils';
import { formatDate } from './date-helper';

export function main() {
  const message = greet('World');
  const today = formatDate(new Date());
  console.log(`${message} — today is ${today}`);
}

main();
