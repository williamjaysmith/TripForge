const nodemailer = require('nodemailer');
const pug = require('pug');
// eslint-disable-next-line import/no-extraneous-dependencies
const htmlToText = require('html-to-text');
// eslint-disable-next-line import/no-extraneous-dependencies
const Transport = require('nodemailer-brevo-transport');

// class for creating email objects to abstract from the send function and have in one place
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `William Smith <${process.env.EMAIL_FROM}>`;
  }

  // create different email transports depending on the environment
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //Sendgrid
      return nodemailer.createTransport({
        // service: 'Brevo'
        host: process.env.BREVO_EMAIL_HOST,
        port: process.env.BREVO_EMAIL_PORT,
        auth: {
          user: process.env.BREVO_USERNAME,
          pass: process.env.BREVO_PASSWORD,
        },
      });
    }
    // if were in development , were trapping mail so we can take a look
    return nodemailer.createTransport({
      host: process.env.BREVO_EMAIL_HOST,
      port: process.env.BREVO_EMAIL_PORT,
      auth: {
        user: process.env.BREVO_USERNAME,
        pass: process.env.BREVO_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) create / render HTML based on a pug template, renderFile will render the pug into real html
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2)Define the emails options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    // 3)create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes',
    );
  }
};
