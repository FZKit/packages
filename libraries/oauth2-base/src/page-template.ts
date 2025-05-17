export function createPageTemplate(
  body: string,
  { documentTitle, documentLang }: { documentTitle: string; head?: string; documentLang: string },
) {
  return /*html*/ `
    <html lang="${documentLang}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${documentTitle}</title>
      <style>
        ${defaultStyles}
      </style>
    </head>
    <body>
      ${body}
    </body>
    </html>
  `;
}

const defaultStyles = /*css*/ `
 #app-body-base {
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  color: rgb(97, 112, 121);
  font-family: "Source Sans Pro", sans-serif, emoji;
 }

 #app-body-base h3 {
  padding: 0;
  font-size: 19px;
  font-weight: 400;
 }

 #app-body-base h5 {
  margin: 0;
  font-size: 17px;
  font-weight: 400;
 }
`;
