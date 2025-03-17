declare module 'html2pdf.js' {
  function html2pdf(): {
    from: (element: HTMLElement) => any;
    set: (options: any) => any;
    outputPdf: () => ArrayBuffer;
  };
  export default html2pdf;
} 