import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import React, { ChangeEvent, useRef, useState, useEffect } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LoadingDots from "../components/LoadingDots";
import { useRouter } from "next/router";
import { Document, Page, pdfjs } from 'react-pdf';
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { getEHRData, getPatientData, getAccessToken } from "./api/ehr_request";
import { TupleType } from "typescript";


pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const Home: NextPage = () => {
  /* SUPABASE COMPONENTS FOR AUTH */
  const session = useSession()
  const supabase = useSupabaseClient()


  /* State variables that store user input and GPT-3 results */
  const [loading, setLoading] = useState(false);
  const [clinicalNote, setClinicalNote] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);

  /* State variables for PDF generation */
  const [inputPatientName, setInputPatientName] = useState("");
  const [loadPatientLoading, setloadPatientLoading] = useState(false);
  const [loadedPatientName, setLoadedPatientName] = useState("");
  const [patientDetails, setPatientDetails] = useState("");

  /* Router to navigate between pages*/
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('No file selected');
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [patients, setPatients] = useState<string[]>([]);
  const [patientIDs, setPatientIDs] = useState<string[]>([]);
  const [birthdays, setBirthdays] = useState<string[][]>([[]]);
  const [addresses, setAddresses] = useState<string[][]>([[]]);
  const [phonenumbers, setPhoneNumbers] = useState<string[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | undefined>();
  const [selectedPatientID, setSelectedPatientID] = useState<string | undefined>();
  const [token, setToken] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<Date | null>(null);
  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectPatient = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPatient(event.target.value);
  };

  const testEHR = async (e: any) => {
    if (selectedPatientID && token) {
      const res = await getEHRData(selectedPatientID, token);
      const txt = res.data.entry[0].resource.reasonCode[0].text;
      console.log(txt);
      generateCodes(e, txt);
    } else {
      alert("patient not selected.");
    }
  };

  const testPatient = async () => {
    console.log("entered patient: ", token);
    if (!token) { refreshToken(); }
    // if (!token) {refreshToken();}
    else {
      const res = await getPatientData(token);
      console.log("RESPONSE: ", res);
      const patientData = res.data.entry;
      var patientList = [];
      var patientIDsTemp = [];
      var bdays = [];
      var addys = [];
      var phones = [];
      for (let i = 0; i < patientData.length; i++) {
        patientIDsTemp.push(patientData[i].resource.id);
        const nameEntry = patientData[i].resource.name[0];
        patientList.push(nameEntry.given[0] + " " + nameEntry.family);
        console.log("BIRTHDAYYYY", patientData[i].resource.birthDate);
        const bday = patientData[i].resource.birthDate.split("-"); // "2023-06-07" format
        bdays.push([bday[1], bday[2], bday[0]]) // (MM, DD, YYYY)
        phones.push(patientData[i].resource.telecom[0].value) // "1234567890" format
        const addressObject = patientData[i].resource.address[0];
        addys.push([addressObject.line[0], addressObject.city, addressObject.state, addressObject.postalCode]); // (street, city, state, zip)
      }
      console.log("PATIENTS:", patientList);
      console.log("PATIENT IDS:", patientIDsTemp);
      console.log("bdays:", bdays);
      console.log("addys:", addys);
      console.log("phonenumber:", phones);
      /* record the values in useState */
      setSelectedPatient(patientList[0]);
      setSelectedPatientID(patientIDsTemp[0]);
      setPatients(patientList);
      setPatientIDs(patientIDsTemp);
      setBirthdays(bdays);
      setAddresses(addys);
      setPhoneNumbers(phones);
    }
  };

  useEffect(() => {
    console.log("shoudl be entering patient...");
    testPatient();
  }, [token]);

  useEffect(() => {
    if (selectedPatient) {
      const index = patients.indexOf(selectedPatient);
      setSelectedPatientID(patientIDs[index]);
      const patientDetailsObject: Record<string, any> = { 
        "id": patientIDs[index], 
        "pt_name": selectedPatient, 
        "pt_street": addresses[index][0], 
        "pt_city": addresses[index][1], 
        "pt_state": addresses[index][2], 
        "pt_zip": addresses[index][3], 
        "pt_phone": phonenumbers[index], 
        "birth_mm": birthdays[index][0], 
        "birth_dd": birthdays[index][1],
        "birth_yy": birthdays[index][2]
      }
      setPatientDetails((JSON.stringify(patientDetailsObject)));
    }
  }, [selectedPatient])

  useEffect(() => {
    if (pageTexts.length != 0) {
      router.push({
        pathname: 'appeals/[appeals]',
        query: {
          appeals: encodeURIComponent(pageTexts[1]),
          url: encodeURIComponent(pageTexts[0])
        }
      });
    }
  }, [pageTexts]);

  const getNewToken = async () => {
    const response = await getAccessToken();
    console.log("TOkEN RESPONSE", response);
    if (!response) {
      throw new Error('Failed to refresh token');
    }
    const now = new Date();
    return {
      token: response.data.access_token, // These field names may vary depending on your API
      expiry: new Date(now.getTime() + 1000 * 60 * 60),
    };
  };

  const refreshToken = async () => {
    try {
      const { token, expiry } = await getNewToken();
      setToken(token);
      setExpiry(expiry);
      console.log("set token to ", token, expiry);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Handle token refresh failure (e.g. log the user out, show an error message, etc.)
    }
  };

  /* refresh token every hour/ */
  useEffect(() => {
    if (!expiry) {
      // If there's no expiry time set, we need to refresh the token right away
      refreshToken();
    } else {
      // Calculate the time until the token expires. Refresh 5 minutes before the token actually expires.
      const msUntilExpiry = expiry.getTime() - new Date().getTime() - (5 * 60 * 1000);
      const timeoutId = setTimeout(refreshToken, msUntilExpiry);

      // Clear the timeout if the component is unmounted
      return () => clearTimeout(timeoutId);
    }
  }, [expiry]); // When expiry changes, set up a new timer

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    setPageTexts([]);
    if (file) {
      console.log('Selected file:', file);
      const fileUrl = URL.createObjectURL(file);
      setPageTexts([]);
      setSelectedFileName(file.name);
      const loadOptions = {
        cMapUrl: 'cmaps/',
        cMapPacked: true,
      };
      pdfjs.getDocument({ url: fileUrl, ...loadOptions }).promise.then((pdf) => {
        const pagePromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          pagePromises.push(
            new Promise(async (resolve) => {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const text = content.items.map((item) => item.str).join(' ');
              resolve(text);
            })
          );
        }
        Promise.all(pagePromises).then((pages) => {
          setPageTexts([fileUrl, pages.join(' ')]);
        });
      });
    } else {
      setSelectedFileName('No file selected');
    }
  };

  useEffect(() => {
    if (pageTexts.length != 0) {
      router.push({
        pathname: 'appeals/[appeals]',
        query: {
          appeals: encodeURIComponent(pageTexts[1]),
          url: encodeURIComponent(pageTexts[0])
        }
      });
    }
  }, [pageTexts]);


  // const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files && event.target.files[0];
  //   setSelectedFile(file);
  // };

  // const handleUpload = () => {
  //   if (selectedFile) {
  //     // Perform the file upload using your preferred method (e.g., fetch, Axios)
  //     // You can access the file using the `selectedFile` variable
  //     console.log('Uploading file:', selectedFile);
  //     // Add your file upload logic here
  //   } else {
  //     console.log('No file selected.');
  //   }
  // };

  const promptBeginning = `You are a medical coder. Your job is to translate the following diagnosis note into the correct ICD-10 billing codes. 
  You must also provide an explanation as to why each code is correct based on the provided diagnosis.
  Return your answer in the following format: 
  Code: T81.530A
  Explanation: this patient visit is an initial encounter for perforation due to foreign body accidentally left in body following surgical operation.
  Code: H66.92
  Explanation: the patient was treated for otitis media in the left ear.
  Here is the diagnosis you should analyze: `

  const generateCodes = async (e: any, notes?: string) => {
    e.preventDefault();
    setLoading(true);

    var icdResults = "";
    var noteType = "";
    if (notes !== undefined) {
      noteType = notes;
    } else {
      noteType = clinicalNote;
    }

    const prompt = promptBeginning + "\n" + noteType;
    console.log("PROMPT:", prompt)
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    // This data is a ReadableStream
    const data = response.body;
    if (!data) {
      return;
    }

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      icdResults = icdResults + chunkValue;
    }

    setLoading(false);
    if (icdResults == "") {
      throw new Error("NO CODES FOUND");
    }
    else {
      router.push({
        pathname: '/[codes]',
        query: {
          codes: icdResults,
          note: noteType,
          patient: JSON.stringify(patientDetails)
        }
      });
    }
  };

  //
  // <!--    old code let icdResults = "";
  //
  //     // function to process the note
  //     const processNote = async (note: string) => {
  //       const prompt = promptBeginning + "\n" + note;
  //       const response = await fetch("/api/generate", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({ prompt }),
  //       });
  //       if (!response.ok) throw new Error(response.statusText);
  //
  //       const data = await response.text();
  //       return data;
  //     };
  //
  //     if (file) {
  //       const reader = new FileReader();
  //       reader.onload = async (evt) => {
  //         if (!evt.target || !evt.target.result) {
  //           console.error('No file content found');
  //           return;
  //         }
  //         setIsFileUploaded(true);
  //         const note = evt.target.result as string;
  //         icdResults = await processNote(note);
  //         if (icdResults) {
  //           router.push({
  //             pathname: '/[codes]',
  //             query: { codes: icdResults, note, patient: JSON.stringify(patientDetails) },
  //           });
  //         } else {
  //           throw new Error("NO CODES FOUND");
  //         }
  //         setLoading(false);
  //       };
  //       reader.readAsText(file);
  //     } else {
  //       icdResults = await processNote(clinicalNote);
  //       if (icdResults) {
  //         router.push({
  //           pathname: '/[codes]',
  //           query: { codes: icdResults, note: clinicalNote, patient: JSON.stringify(patientDetails) },
  //         });
  //       } else {
  //         throw new Error("NO CODES FOUND");
  //       }
  //       setLoading(false);
  //     }
  //   }; -->


  /* polls database and load matched patient information */
  const loadPatient = async (e: any) => {
    console.log("patient name is", inputPatientName);
    console.log("loading patient info....");

    let { data } = await supabase.from('patients').select().eq('id', parseInt(inputPatientName));
    console.log("patient info is...", JSON.stringify(data[0]));
    setPatientDetails((JSON.stringify(data[0])));
    setLoadedPatientName(data[0]["pt_name"]); // always returned as a list of 1
  }


  return (
    <div className="main-container">
      {!session ? (
        <div className="login-sub-container">
          <div className="login-left-container">
            <div className="login-header">REMA <span style={{ color: 'black' }}> HEALTH </span></div>
            <div className="login-title-text">AI-Driven Medical Coding</div>
            <div className="login-sub-text">We empower healthcare organizations with state-of-the-art technology, automating your medical coding process to ensure faster, cheaper,
              and more accurate billing. Our system offers seamless integration with your workflow, so you can quickly go back to doing what you love - caring for patients. </div>
            <div className="login-sub-text">Are you ready to supercharge your billing operations? Sign up for free today.</div>
            <div className="login-auth-box">
              <Auth
                providers={[]}
                supabaseClient={supabase}
                appearance={{
                  // If you want to extend the default styles instead of overriding it, set this to true
                  extend: false,
                  // Your custom classes
                  className: {
                    anchor: "text-[#5473E3] mb-5 hover:text-[#2347C5] hover:underline",
                    button: "rounded-full bg-[#3D5FD9] text-[#F5F7FF] w-[25rem] p-3 mt-5 hover:bg-[#2347C5] mb-5",
                    container: "login-container",
                    divider: 'login-anchor',
                    label: 'login-label',
                    input: 'login-input',
                  },
                }}
              />
            </div>
          </div>
          <div className="login-right-container">
            <Image
              alt="Doctors Icon"
              src="/doc.png"
              width={1500}
              height={1500}
            />
          </div>
        </div>
      ) : (
        <div className="manual">
          <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
            <Head>
              <title>AI for Medical Coding</title>
            </Head>
            <Header session={session} />
            <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
              <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
                Automate medical coding using GPT
              </h1>
              <p className="text-slate-500 mt-5">Works with the latest ICD-10 codes.</p>
              <div className="max-w-xl w-full">
                <div className="flex mt-10 items-center space-x-3">
                  <Image
                    src="/1-black.png"
                    width={30}
                    height={30}
                    alt="1 icon"
                    className="mb-5 sm:mb-0"
                  />
                  <p className="text-left font-medium">
                    <span style={{ color: '#4D77FF' }}>Using OpenEMR:</span> Select a patient to retrieve and code their most recent clinical note. {" "}
                  </p>
                </div>
                <select className="patient-dropdown" value={selectedPatient} onChange={handleSelectPatient}>
                  <option value="" disabled>Select a patient</option>
                  {patients.map((patient, index) => (
                    <option key={index} value={patient}>{patient}</option>
                  ))}
                </select>
                {!loading && (
                  <button onClick={testEHR} className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full">
                    Generate ICD-10 codes &rarr;
                  </button>
                )}
                {loading && (
                  <button className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                    disabled>
                    <LoadingDots color="white" style="large" />
                  </button>
                )}


                <div className="flex mt-10 items-center space-x-3">
                  <Image
                    src="/2-black.png"
                    width={30}
                    height={30}
                    alt="2 icon"
                    className="mb-5 sm:mb-0"
                  />
                  <p className="text-left font-medium">
                    <span style={{ color: '#4D77FF' }}>Manual Import:</span> Don't use OpenEMR? Enter your patient ID.{" "}
                  </p>
                </div>
                <textarea
                  value={inputPatientName}
                  onChange={(e) => setInputPatientName(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                  placeholder={
                    "Enter your existing patient ID."
                  }
                />
                {!loadPatientLoading && (
                  <button onClick={(e) => loadPatient(e)} className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full">
                    Load Existing Patient &rarr;
                  </button>
                )}
                {loadPatientLoading && (
                  <button className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                    disabled>
                    <LoadingDots color="white" style="large" />
                  </button>
                )}
                <br />
                {loadedPatientName ? (
                  <h2 className="subtitle">Patient Information for {loadedPatientName} has been loaded. </h2>
                ) : (
                  <h2 className="subtitle">
                    No Patient Information Currently Loaded.
                  </h2>
                )}
                <textarea
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                  placeholder={
                    "Copy and paste the clinical note here. Please limit notes to 2000 characters."
                  }
                />
                {!loading && (
                  <button onClick={(e) => generateCodes(e)} className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full">
                    Generate ICD-10 codes &rarr;
                  </button>
                )}
                {loading && (
                  <button className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                    disabled>
                    <LoadingDots color="white" style="large" />
                  </button>
                )}
                <div className="flex mt-10 items-center space-x-3">
                  <p className="text-left font-medium">
                    [WIP]: Got a denied claim? We'll analyze the denial and generate an appeal letter for you  {" "}
                    <span className="text-slate-500">
                      (accepts PDF).
                    </span>
                  </p>
                </div>
                {!loading && (
                  <>
                    <input
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    <label htmlFor="fileInput">{selectedFileName}</label>
                    <button onClick={handleUploadButtonClick} className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full">
                      Upload the denial letter here &rarr;
                    </button>
                  </>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
