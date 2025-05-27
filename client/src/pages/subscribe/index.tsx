import { useEffect } from "react";
import { useLocation } from "wouter";

// This is a redirect component to handle subscription requests
export default function SubscribeIndex() {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Redirect to pricing page if someone accesses /subscribe directly
    navigate("/pricing");
  }, [navigate]);
  
  return null;
}