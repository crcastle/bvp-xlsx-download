const postmark = require("postmark")(process.env.POSTMARK_API_TOKEN)
const request = require('request');

// Ugh, www.bvp.com has some janky SSL cert that's not trusted by Node
require('ssl-root-cas/latest').inject()
  .addFile(__dirname + '/ssl/cert1.pem')
  .addFile(__dirname + '/ssl/cert2.pem')
  .addFile(__dirname + '/ssl/cert3.pem')
  ;

// Get file
const pageUrl = process.env.PAGE_URL || 'https://www.bvp.com/strategy/cloud-computing/index';
request.get(pageUrl, (error, response, body) => {
  if (error) {
    console.error("Error accessing " + pageUrl);
    console.error(error);
    return;
  }
  if (!error && response.statusCode == 200) {
    const xlsxUrl = body.match(/href\=\"(.*xlsx)\"/)[1];
    var chunks = [];
    request.get(xlsxUrl)
           .on('error', err => {
             console.error("Error downloading xlsx file " + xlsxUrl);
             console.log(err);
           })
           .on('data', chunk => chunks.push(chunk))
           .on('end', () => {
             const xlsxBuf = Buffer.concat(chunks);

             // Get fixed length and sortable date
             const date = new Date().toISOString().substring(0,10);

             // Email file
             postmark.send({
               "From": "bvp-xlsx-download@crc.io",
               "To": process.env.TO_ADDRESS,
               "Subject": "Daily BVP XLSX",
               "TextBody": "Hello!",
               "Attachments": [{
                 "Content": xlsxBuf.toString('base64'),
                 "Name": "bvp-" + date + ".xlsx",
                 "ContentType": "application/octet-stream"
               }]
             }, function(error, success) {
               if(error) {
                 console.error("Unable to send via postmark: " + error.message);
                 return;
               }
               console.info("Sent to postmark for delivery");
             });
           });
  }
});
