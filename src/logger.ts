export class Logger {
  private debugWindow: Window | null = null;
  private logBuffer: string[] = [];
  private logScroll: number = 1;
  private allowInternalLog: boolean = false;

  constructor() {
    addEventListener("unload", () => this.debugWindow?.close());
  }

  internalLog(...messages: any[]): void {
    if (!this.allowInternalLog) return;
    
    this.log(...messages);
  }

  log(...messages: any[]) {
    const formattedMessages: any[] = [];
    messages.forEach((message) => {
      if (message === undefined) {
        formattedMessages.push("undefined");
        return;
      }

      formattedMessages.push(JSON.stringify(message).replace(/\\?\"/g, ""));
    });

    // formattedMessages.unshift(`[${(new Error().stack.toString().split(/\r\n|\n/))[2].replace(/([\S\s]*\/Voidformer\/)|(\)$)/g, '')}] `);
    this.logBuffer.push(formattedMessages.join(""));
  }

  setAllowInternalLog(newValue: boolean) {
    this.allowInternalLog = newValue;
  }

  allowsInternalLog(): boolean {
    return this.allowInternalLog;
  }

  update() {
    if (this.debugWindow == null || this.debugWindow.closed) {
      this.debugWindow = window.open(
        "",
        "DEBUG",
        `width=${screen.width / 2},height=${screen.height},top=${
          (screen.height - 500) / 2
        },left=${screen.width - 500}`
      );

      if (this.debugWindow == null) throw new ReferenceError("Could not open a new Debug Window.");

      this.debugWindow.document.body.appendChild(
        this.debugWindow.document.createElement("pre")
      );
    }

    let text: HTMLPreElement | null = this.debugWindow.document.querySelector("pre");
    if (text == null) {
      text = this.debugWindow.document.createElement('pre');
      this.debugWindow.document.body.appendChild(text);
    }
    text.textContent = this.logBuffer.join("\n");
    this.logScroll =
      this.debugWindow.document.body.scrollTop /
      this.debugWindow.document.body.scrollHeight;
    this.debugWindow.scrollTo(
      this.debugWindow.document.body.scrollLeft,
      this.logScroll * this.debugWindow.document.body.scrollHeight
    );

    this.logBuffer = [];
  }
}

// let debugWindow = null;
// let logBuffer = [];
// let logScroll = 1;

// function log(...messages) {
//   const formattedMessages = [];
//   messages.forEach(message => {
//     if (message === undefined) {
//       formattedMessages.push("undefined");
//       return;
//     }

//     formattedMessages.push(JSON.stringify(message).replace(/\\?\"/g, ''))
//   });

//   // formattedMessages.unshift(`[${(new Error().stack.toString().split(/\r\n|\n/))[2].replace(/([\S\s]*\/Voidformer\/)|(\)$)/g, '')}] `);
//   logBuffer.push(formattedMessages.join(''));
// }

// function logUpdate() {
//   if (debugWindow == null || debugWindow.closed) {
//     debugWindow = window.open("", "DEBUG", `width=${screen.width / 2},height=${screen.height},top=${(screen.height - 500) / 2},left=${screen.width - 500}`);
//     debugWindow.document.body.appendChild(debugWindow.document.createElement("pre"));
//   }

//   const text = debugWindow.document.querySelector('pre');
//   text.textContent = logBuffer.join("\n");
//   logScroll = debugWindow.document.body.scrollTop / debugWindow.document.body.scrollHeight;
//   debugWindow.scrollTo(debugWindow.document.body.scrollLeft, logScroll * debugWindow.document.body.scrollHeight);
// }
