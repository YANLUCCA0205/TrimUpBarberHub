import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { UserCheck, Gift } from 'lucide-react';

const FIELDS = [
  { key: 'full_name', weight: 15, fallback: 'name' },
  { key: 'phone', weight: 15 },
  { key: 'avatar_url', weight: 15 },
  { key: 'cep', weight: 10 },
  { key: 'street', weight: 10 },
  { key: 'city', weight: 10 },
  { key: 'state', weight: 10 },
  { key: 'birthday', weight: 15 },
];

function calcCompletion(profile, client) {
  let total = 0;
  for (const f of FIELDS) {
    const val =
      profile?.[f.key] ||
      (f.fallback && client?.[f.fallback]);
    // Treat "Usuário" placeholder as empty for full_name
    if (f.key === 'full_name' && val === 'Usuário') continue;
    if (val && String(val).trim() !== '') total += f.weight;
  }
  return total;
}

export default function ProfileCompletionBar({ client, profile }) {
  const percentage = calcCompletion(profile, client);

  // Don't render if profile is fully complete
  if (percentage >= 100) return null;

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        {percentage < 100 ? (
          <UserCheck className="w-5 h-5 text-primary shrink-0" />
        ) : (
          <Gift className="w-5 h-5 text-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Seu perfil está {percentage}% completo.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {percentage < 100
              ? 'Complete seus dados para uma experiência personalizada.'
              : 'Perfil completo! 🎉'}
          </p>
        </div>
      </div>

      <Progress value={percentage} className="h-2 mb-3" />

      {percentage < 100 && (
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Completar perfil →
        </Link>
      )}
    </div>
  );
}
