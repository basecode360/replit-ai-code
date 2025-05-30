import { Helmet } from "react-helmet";
import EventForm from "../components/events/EventForm";

export default function CreateEvent() {
  return (
    <>
      <Helmet>
        <title>Create Training Event - Venice AI System</title>
        <meta
          name="description"
          content="Create a new training event in the 8-step military training model and assign participants."
        />
      </Helmet>

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-condensed font-bold text-gray-900">
            Create Training Event
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define a new training event following the 8-step training model
          </p>
        </div>

        <EventForm />
      </div>
    </>
  );
}
