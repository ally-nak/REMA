import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LoadingDots from "../components/LoadingDots";
import Link from 'next/link';
import { useRouter } from "next/router";

//database
import clientPromise from "../database/mongodb";
import { InferGetServerSidePropsType } from 'next'
import {ObjectId} from "mongodb";

const Home: NextPage  = () => {
  /* State variables that store user input and GPT-3 results */ 
  const [loading, setLoading] = useState(false);
  const [createPatientLoading, setCreatePatientLoading] = useState(false);
  const [loadPatientLoading, setloadPatientLoading] = useState(false);
  const [clinicalNote, setClinicalNote] = useState("");
  const [inputPatientName, setInputPatientName] = useState("");
  const [apiKey, setApiKey] = useState("");

  let loadedPatientName = null;

  /* Router to navigate between pages*/
  const router = useRouter();

  const promptBeginning = `You are a medical coder. You must identify all correct ICD-10 codes for the following patient record. Be as specific as possible. 
  Return your answer in the following format: T81.530, E09.52, L89.213`;

  const generateCodes = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    var icdResults = "";

    const prompt = promptBeginning + "\n" + clinicalNote;
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
          note: clinicalNote
        }
      });
    }
  };


  //on-click event that queries mongoDB database and returns the name as the appropriate global variable
  //This is a temporary work-around, will be moving to a getServerSideProps() model as soon as possible
  // (TODO for now because it requires rewriting this entire document)
  const loadPatient = async (e: any) => {
  e.preventDefault();
  setloadPatientLoading(true);

  try {
      const client = await clientPromise;
      const db = client.db("patients");

      const patient = await db
          .collection("patient")
          .findOne({_id: ObjectId('645174155a19b5b1405eb419')}, {name:1})

      loadedPatientName = patient;
    } catch (e) {
        console.error(e);
    }
  };


  //placeholder function, need to figure out what information CMS1500 needs
  const createNewPatient = async (e: any) => {
    e.preventDefault();
    setCreatePatientLoading(true);
    return {}
  }

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>AI for Medical Coding</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
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
              Create a new patient...{" "}
              <span className="text-slate-500">
                (import from EPIC coming soon)
              </span>
              .
            </p>
          </div>

          {!createPatientLoading && (
              <button onClick={(e) => createNewPatient(e)} className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full">
                Create New Patient &rarr;
              </button>
          )}
          {createPatientLoading && (
            <button className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              disabled>
              <LoadingDots color="white" style="large" />
              </button>
          )}

          <div className="flex mt-10 items-center space-x-3">
            <p className="text-left font-medium">
              ...or load your existing patient information.
              .
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

          <br/>
          {loadedPatientName ? (
            <h2 className="subtitle">Patient Information for {loadedPatientName} has been loaded. </h2>
          ) : (
            <h2 className="subtitle">
              No Patient Information Currently Loaded.
            </h2>
          )}

          <div className="flex mt-10 items-center space-x-3">
            <Image
              src="/2-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-5 sm:mb-0"
            />
            <p className="text-left font-medium">
              Enter your clinical notes {" "}
              <span className="text-slate-500">
                (no special formatting necessary)
              </span>
              .
            </p>
          </div>
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
        </div>
      </main>
    </div>
  );
};

export default Home;