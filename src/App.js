import { useState } from 'react';
import { Button } from 'antd';
import CryptoJS from 'crypto-js';
import axios from 'axios';

var key = '30980f98296b77f00a55f3c92b35322d898ae2ffcdb906de40336d2cf3d556a0';
key = CryptoJS.enc.Hex.parse(key);
const iv = CryptoJS.enc.Hex.parse('e5889166bb98ba01e1a6bc9b32dbf3e6');

const App = () => {
  const [inputFile, setInputFile] = useState(null);
  const [inputDecryptedFile, setInputDecryptedFile] = useState(null)
  const [processTime, setProcessTime] = useState(0);

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setInputFile(file);
    }
  };

  const handleFileInputDecrypted = (event) => {
    const file = event.target.files[0];
    if (file) {
      setInputDecryptedFile(file);
    }
  };

  const handleDecryptedFile = async () => {
    if (inputDecryptedFile) {
      try {
        await decryptFile(inputDecryptedFile, key, iv);
      } catch (error) {
        console.error("Error encrypting file:", error);
      }
    }
  };

  const handleEncryptFile = async () => {
    if (inputFile) {
      const startTime = performance.now();
      try {
        await encryptFile(inputFile, key, iv);

        const endTime = performance.now();
        const timeElapsed = endTime - startTime;
        setProcessTime(Math.round(timeElapsed));
      } catch (error) {
        console.error("Error encrypting file:", error);
      }
    }
  };


  const encryptFile = async (file, key, iv) => {
    const fileSize = file.size;
    const chunkSize = fileSize < 1024 ? fileSize : 1024;
    let offset = 1024;

    let randomUint8Array = new Uint8Array(1024);
    crypto.getRandomValues(randomUint8Array);
    let RandomDataArrayBuffer = randomUint8Array.buffer;

    const firstChunk = await readChunk(file, 0, chunkSize);
    const encryptedFirstChunk = CryptoJS.AES.encrypt(ArrayBufferToWordArray(firstChunk), key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const FirstChunkArrayBuffer = WordArrayToArrayBuffer(encryptedFirstChunk.ciphertext);

    let restOfFile = new ArrayBuffer(0);
    if (fileSize > 1024) {
      while (offset < fileSize) {
        let chunk = await readChunk(file, offset, 1024 * 1024 * 1024);
        let newLength = restOfFile.byteLength + chunk.byteLength;
        let newRestOfFile = new Uint8Array(newLength);
        newRestOfFile.set(restOfFile, 0);
        newRestOfFile.set(new Uint8Array(chunk), restOfFile.byteLength);
        console.log(newRestOfFile);
        restOfFile = newRestOfFile;
        offset += 1024 * 1024 * 1024
      }
    }

    const wholeEncryptedFile = new Uint8Array(RandomDataArrayBuffer.byteLength + FirstChunkArrayBuffer.byteLength + restOfFile.byteLength);
    wholeEncryptedFile.set(new Uint8Array(RandomDataArrayBuffer), 0);
    wholeEncryptedFile.set(new Uint8Array(FirstChunkArrayBuffer), RandomDataArrayBuffer.byteLength);
    if (fileSize > 1024) {
      wholeEncryptedFile.set(new Uint8Array(restOfFile), RandomDataArrayBuffer.byteLength + FirstChunkArrayBuffer.byteLength);
    }
    // download(inputFile, wholeEncryptedFile)
  };

  const decryptFile = async (file, key, iv) => {
    const fileSize = file.size;
    let decryptedFile;
    let offset = 2064;
    let restOfFile = new ArrayBuffer(0);
    if (fileSize > 2064) {
      const firstChunk = await readChunk(file, 1024, 1040);
      const decryptedFirstChunk = CryptoJS.AES.decrypt({ ciphertext: ArrayBufferToWordArray(firstChunk) }, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
      const FirstChunkArrayBuffer = WordArrayToArrayBuffer(decryptedFirstChunk);
      while (offset < fileSize) {
        let chunk = await readChunk(file, offset, 1024 * 1024 * 1024);
        let newLength = restOfFile.byteLength + chunk.byteLength;
        let newRestOfFile = new Uint8Array(newLength);
        newRestOfFile.set(restOfFile, 0);
        newRestOfFile.set(new Uint8Array(chunk), restOfFile.byteLength);
        restOfFile = newRestOfFile;
        offset += 1024 * 1024 * 1024
      }

      decryptedFile = new Uint8Array(FirstChunkArrayBuffer.byteLength + restOfFile.byteLength);
      decryptedFile.set(new Uint8Array(FirstChunkArrayBuffer), 0);
      decryptedFile.set(new Uint8Array(restOfFile), FirstChunkArrayBuffer.byteLength);
    } else {
      const fileData = await readChunk(file, 1024, fileSize);
      const decryptedData = CryptoJS.AES.decrypt({ ciphertext: ArrayBufferToWordArray(fileData) }, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
      decryptedFile = WordArrayToArrayBuffer(decryptedData);
    }
    download(inputDecryptedFile, decryptedFile)
  };

  const readChunk = (file, offset, chunkSize) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const chunk = file.slice(offset, offset + chunkSize);

      reader.onload = (event) => {
        resolve(event.target.result);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(chunk);
    });
  };

  const ArrayBufferToWordArray = arrayBuffer => {
    const u8 = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength);
    const len = u8.length;
    const words = [];
    for (let i = 0; i < len; i += 1) {
      words[i >>> 2] |= (u8[i] & 0xff) << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, len);
  }

  const WordArrayToArrayBuffer = wordArray => {
    const { words } = wordArray;
    const { sigBytes } = wordArray;
    const u8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i += 1) {
      const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      u8[i] = byte;
    }
    return u8.buffer;
  }


  const getFileMimeType = (file) => {
    const fileNameParts = file.name.split('.');
    const fileExtension = fileNameParts[fileNameParts.length - 1];

    switch (fileExtension) {
      case 'doc':
      case 'docx':
        return 'application/msword';
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'txt':
        return 'text/plain';
      case 'zip':
        return 'application/zip';
      case '7z':
        return 'application/x-7z-compressed';
      default:
        return 'application/octet-stream'; // Fallback MIME type
    }
  };

  const download = (file, arrayBuffer) => {
    const mimeType = getFileMimeType(file);
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url; // 将链接设置为文件的 URL
    downloadLink.download = 'downloadFile'; // 设置下载的文件名
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }


  return (
    <div>
      <div>
        <span>需要加密的文件</span>
        <input type="file" onChange={handleFileInputChange} style={{ marginLeft: '5px' }} />
      </div>
      <br />
      <Button onClick={handleEncryptFile} style={{ marginTop: 10 }}>
        加密
      </Button>
      <br />
      <p>处理时间: {processTime} 毫秒</p>

      <div>
        <span>需要解密的文件</span>
        <input type="file" onChange={handleFileInputDecrypted} style={{ marginLeft: '5px' }} />
      </div>
      <br />
      <Button onClick={handleDecryptedFile} style={{ marginTop: 10 }}>
        解密
      </Button>
      <br />
    </div>
  );
};

export default App
