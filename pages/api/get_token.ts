import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import https from 'https'; // import https module


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false
    });

      const data = new URLSearchParams();
      data.append('grant_type', 'password');
      data.append('client_id', 'Uw9QOtc7BfswDWCHNnUhGwQy_kjti2QdCwNnEf4OTYE');
      data.append('scope', 'openid offline_access api:oemr api:fhir user/allergy.read user/allergy.write user/appointment.read user/appointment.write user/dental_issue.read user/dental_issue.write user/document.read user/document.write user/drug.read user/encounter.read user/encounter.write user/facility.read user/facility.write user/immunization.read user/insurance.read user/insurance.write user/insurance_company.read user/insurance_company.write user/insurance_type.read user/list.read user/medical_problem.read user/medical_problem.write user/medication.read user/medication.write user/message.write user/patient.read user/patient.write user/practitioner.read user/practitioner.write user/prescription.read user/procedure.read user/soap_note.read user/soap_note.write user/surgery.read user/surgery.write user/transaction.read user/transaction.write user/vital.read user/vital.write user/AllergyIntolerance.read user/CareTeam.read user/Condition.read user/Coverage.read user/Encounter.read user/Immunization.read user/Location.read user/Medication.read user/MedicationRequest.read user/Observation.read user/Organization.read user/Organization.write user/Patient.read user/Patient.write user/Practitioner.read user/Practitioner.write user/PractitionerRole.read user/Procedure.read');
      data.append('user_role', 'users');
      data.append('username', 'admin');
      data.append('password', 'i-0009fcbd5da76f1b6');      
      console.log("HERE IN GET TOKEN");
      const response = await axios.post('https://ec2-18-236-204-32.us-west-2.compute.amazonaws.com/oauth2/default/token', data, {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpsAgent // Add httpsAgent to axios request config
      });
      console.log("token response", response);
      res.status(200).json(response.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
}
export default handler;
