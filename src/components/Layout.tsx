import { ReactNode } from "react";
interface LayoutProps {
  children: ReactNode;
  backgroundImage?: string;
  className?: string;
}
export const Layout = ({
  children,
  backgroundImage,
  className = ""
}: LayoutProps) => {
  return <div className={`min-h-screen ${className} ${backgroundImage ? 'bg-cover bg-center bg-no-repeat' : 'bg-gradient-to-br from-background via-primary-light/10 to-secondary-light/10'}`} style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}>
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
      
      {/* Footer */}
      <footer className="bg-card border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <span>© 2025 Passaporte Saúde - Shiatsu In Company</span>
            <div className="flex gap-4">
              <button className="hover:text-primary transition-colors">
                Termos de Uso
              </button>
              <button className="hover:text-primary transition-colors">
                Política de Privacidade
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};