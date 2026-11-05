export class Logger {
  private static getFormattedTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    const dayName = days[now.getDay()];
    const dayNum = now.getDate();
    const monthName = months[now.getMonth()];

    return `${hours}:${minutes} / ${dayName}, ${dayNum} de ${monthName}`;
  }

  private static printLog(type: string, message: string, colorCode: string): void {
    const time = this.getFormattedTime();
    console.log(`\x1b[37m┌──(\x1b[0m \x1b[36m${time}\x1b[0m \x1b[37m)-[\x1b[0m ${colorCode}${type}\x1b[0m \x1b[37m]\x1b[0m`);
    console.log(`\x1b[37m└──#\x1b[0m ${colorCode}${message}\x1b[0m\n`);
  }

  static success(message: string, context: string = 'Success'): void {
    this.printLog(context, message, '\x1b[32m');
  }

  static warning(message: string, context: string = 'WarningError'): void {
    this.printLog(context, message, '\x1b[33m');
  }

  static error(message: string, context: string = 'DangerError'): void {
    this.printLog(context, message, '\x1b[31m');
  }

  static info(message: string, context: string = 'Info'): void {
    this.printLog(context, message, '\x1b[36m');
  }

  static debug(message: string, context: string = 'Debug'): void {
    this.printLog(context, message, '\x1b[35m');
  }
}
