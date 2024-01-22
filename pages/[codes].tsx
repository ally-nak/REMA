import type { NextPage } from "next";
import { useRouter } from "next/router";
import LeftTextbox from "../components/LeftTextbox";
import IcdCodes from "../components/IcdCodes";
import React from "react";

import downloadjs from "downloadjs";
import { readFileSync } from "fs";


/* PDF Generation Setup */

const fs = require('fs');
const {
  drawImage,
  drawLinesOfText,
  drawRectangle,
  drawText,
  PDFArray,
  PDFContentStream,
  PDFDictionary,
  PDFDocument,
  PDFDocumentFactory,
  PDFDocumentWriter,
  PDFIndirectReference,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFString,
} = require('pdf-lib');


/* PDF Generation Helper functions */

const getAcroFields = (pdfDoc) => {
  if (!pdfDoc.catalog.getMaybe('AcroForm')) return [];
  const acroForm = pdfDoc.index.lookup(pdfDoc.catalog.get('AcroForm'));

  if (!acroForm.getMaybe('Fields')) return [];
  const acroFields = pdfDoc.index.lookup(acroForm.get('Fields'));

  return acroFields.array.map(pdfDoc.index.lookup);
};

const findAcroFieldByName = (pdfDoc, name) => {
  const acroFields = getAcroFields(pdfDoc);
  return acroFields.find((acroField) => {
    const fieldName = acroField.getMaybe('T');
    return !!fieldName && fieldName.string === name;
  });
};

const logAcroFieldNames = (pdfDoc) => {
  const acroFields = getAcroFields(pdfDoc);
  acroFields.forEach((acroField) => {
    console.log(
      'Field Name:',
      acroField.get('T').toString(),
      'Field Type:',
      acroField.get('FT').toString()
    );
  });
};

const fillAcroTextField = (
  pdfDoc,
  acroField,
  fontObject,
  text,
  fontSize = 15,
) => {
  const fieldRect = acroField.get('Rect');
  const fieldWidth = fieldRect.get(2).number - fieldRect.get(0).number;
  const fieldHeight = fieldRect.get(3).number - fieldRect.get(1).number;

  const appearanceStream = pdfDoc.register(
    PDFContentStream.of(
      PDFDictionary.from({
        Type: PDFName.from('XObject'),
        Subtype: PDFName.from('Form'),
        BBox: PDFArray.fromArray([
          PDFNumber.fromNumber(0),
          PDFNumber.fromNumber(0),
          PDFNumber.fromNumber(fieldWidth),
          PDFNumber.fromNumber(fieldHeight),
        ], pdfDoc.index),
        Resources: PDFDictionary.from({
          Font: PDFDictionary.from({
            FontObject: fontObject
          }, pdfDoc.index)
        }, pdfDoc.index),
      }, pdfDoc.index),
      drawLinesOfText(text.split('\n'), {
        x: 2,
        y: fieldHeight - 13,
        font: 'FontObject',
        size: fontSize,
        colorRgb: [0, 0, 0],
      })
    ),
  );

  acroField.set('V', PDFString.fromString(text));
  acroField.set('Ff', PDFNumber.fromNumber(1));
  acroField.set('AP', PDFDictionary.from({ N: appearanceStream }, pdfDoc.index));
};

const fillInField = (fieldName, text, fontSize) => {
  const field = findAcroFieldByName(pdfDoc, fieldName);
  if (!field) throw new Error(`Missing AcroField: ${fieldName}`);
  fillAcroTextField(pdfDoc, field, FontHelvetica, text, fontSize);
};


const Results: NextPage = () => {
  const router = useRouter();
  /* SHOW ERROR MESSAGE */
  if (!router.query.codes) {
    return (
      <h1>
        We're sorry, an error has occurred. Please try again.
      </h1>
    )
  }
  const codes: string = router.query.codes as string;
  const note: string = router.query.note as string;
  const patientDetailsString: string = router.query.patient as string;


  console.log("CODES", codes);

  console.log("PATIENT", patientDetailsString)
  const patientDetails = JSON.parse(JSON.parse(patientDetailsString)) //errors with one parse...

  const splitCodes = codes.split('\n');
  const codeArray: string[] = [];
  const explanations: string[] = [];
  splitCodes.forEach((elem: string) => {
    console.log("ELEMENT: ", elem);
    if (elem.includes("Code:")) {
      codeArray.push(elem.replace("Code: ", "").replace(".", "").trim());
    } else if (elem.includes("Explanation:")) {
      explanations.push(elem.replace("Explanation: ", "").trim());
    }
  });

  patientDetails['codes'] = codeArray


  console.log("CODEARRAY", codeArray);
  console.log("EXPLANAITONS ARRAY", explanations);

  const generatePDF = async (e: any) => {
    console.log(patientDetails)
    e.preventDefault()
    const response = await fetch("/api/generatePDF", {
      method: "POST", headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patientDetails)
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const array = await response.arrayBuffer()
    const blob = new Blob([array], { type: 'application/pdf' });

    downloadjs(blob, "filled_cms_1500.pdf", "application/pdf");
  };

  return (

    <div className="main-container">
      <div className="manual">
        <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
          <div className="flex">
            <div className="w-1/2">
              <LeftTextbox note={note} />
            </div>
            <div className="w-1/2">
              <IcdCodes codeArray={codeArray} explanations={explanations} />
            </div>
          </div>
          <div className="max-w-xl w-full">
            <div className="flex mt-10 items-center space-x-3">
              <button
                onClick={(e) => generatePDF(e)}
                className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              >
                Generate Claims letter! &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

export default Results;
