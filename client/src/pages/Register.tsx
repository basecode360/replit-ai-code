import { Helmet } from "react-helmet";
import AuthWrapper from "@/components/auth/AuthWrapper";
import RegisterForm from "@/components/auth/RegisterForm";

export default function Register() {
  return (
    <>
      <Helmet>
        <title>Register - Military AAR Management System</title>
        <meta name="description" content="Register for the Military After-Action Review Management System to join your unit and participate in training event reviews." />
      </Helmet>
      
      <AuthWrapper>
        <RegisterForm />
      </AuthWrapper>
    </>
  );
}
