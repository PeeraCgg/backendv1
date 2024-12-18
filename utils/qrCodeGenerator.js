import QRCode from 'qrcode';

/**
 * Generate a QR Code from given data
 * @param {Object} data - The data to encode in the QR Code
 * @returns {Promise<string>} - Base64 encoded QR Code
 */
export const generateQRCode = async (data) => {
  try {
    // Convert the data into JSON string
    const qrData = JSON.stringify(data);

    // Generate QR Code as a Base64 image
    const qrCode = await QRCode.toDataURL(qrData);
    return qrCode;
  } catch (error) {
    console.error('Error generating QR Code:', error);
    throw new Error('Failed to generate QR Code');
  }
};
