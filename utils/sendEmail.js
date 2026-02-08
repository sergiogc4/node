// Utilitat fictícia per enviar emails
// En un projecte real, implementaria amb nodemailer, sendgrid, etc.

const sendEmail = async (options) => {
  console.log('📧 Email simulat enviar-se:');
  console.log(`   A: ${options.email}`);
  console.log(`   Assumpte: ${options.subject}`);
  console.log(`   Missatge: ${options.message}`);
  
  // En un entorn real, retornaria una promesa
  return Promise.resolve({
    success: true,
    message: 'Email simulat enviat correctament'
  });
};

module.exports = sendEmail;
