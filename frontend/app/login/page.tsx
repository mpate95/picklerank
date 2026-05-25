import { LoginForm } from "@/components/auth/LoginForm";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Admin Login"
        description="Public users can browse the ladder. Only the admin can create, update, or delete data."
      />
      <div className="max-w-xl">
        <LoginForm />
      </div>
    </div>
  );
}
