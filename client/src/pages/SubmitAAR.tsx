import React from "react";
import { useParams } from "wouter";
import { Helmet } from "react-helmet";
import AARForm from "../components/aars/AARForm";

export default function SubmitAAR() {
  const { eventId } = useParams();
  const eventIdNumber = eventId ? parseInt(eventId) : 0;

  return (
    <>
      <Helmet>
        <title>Submit AAR - GreenBook System</title>
        <meta
          name="description"
          content="Submit an After-Action Review (AAR) for a completed training event to document lessons learned and improvement opportunities."
        />
      </Helmet>

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-condensed font-bold text-gray-900">
            Submit After-Action Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Document lessons learned from your training event
          </p>
        </div>

        <AARForm eventId={eventIdNumber} />
      </div>
    </>
  );
}
