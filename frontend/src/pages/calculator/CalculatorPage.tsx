import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculatorFunctions, calculatorMetadata } from '@/utils/calculations';
import type { CalcInput } from '@/utils/calculations';
import type { CalculationResult } from '@/types';
import { api } from '@/services/api';
import { useList } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import {
  Calculator,
  ArrowLeft,
  Share2,
  Printer,
  Bookmark,
  ChevronRight,
  Ruler,
  Weight,
  Layers,
  HardHat,
  Building2,
  Droplets,
  Zap,
  Pipette,
  BrickWall,
  Route,
  Waves,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';

const calculatorIcons: Record<string, React.ReactNode> = {
  'concrete-mix': <Layers size={24} />,
  'steel-weight': <Weight size={24} />,
  'slab': <Ruler size={24} />,
  'beam': <Building2 size={24} />,
  'column': <Building2 size={24} />,
  'foundation': <HardHat size={24} />,
  'earthwork': <HardHat size={24} />,
  'brick': <BrickWall size={24} />,
  'water-tank': <Droplets size={24} />,
  'road-quantity': <Route size={24} />,
  'pipe-flow': <Waves size={24} />,
  'load': <Zap size={24} />,
  'slope': <SlidersHorizontal size={24} />,
  'cement': <Pipette size={24} />,
};

const categories = [
  {
    name: 'Concrete & Cement',
    items: ['concrete-mix', 'cement', 'brick'],
  },
  {
    name: 'Structural Design',
    items: ['slab', 'beam', 'column', 'foundation'],
  },
  {
    name: 'Steel & Materials',
    items: ['steel-weight', 'load'],
  },
  {
    name: 'Earthwork & Roads',
    items: ['earthwork', 'road-quantity'],
  },
  {
    name: 'Hydraulics',
    items: ['water-tank', 'pipe-flow'],
  },
  {
    name: 'General',
    items: ['slope'],
  },
];

export default function CalculatorPage() {
  const { calculatorType } = useParams();
  const [inputs, setInputs] = useState<CalcInput>({});
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [selectedCalc, setSelectedCalc] = useState(calculatorType || '');
  const [isSaving, setIsSaving] = useState(false);

  useList<any>('/calculators/categories', ['calculator-categories']);

  const calculator = selectedCalc ? calculatorMetadata[selectedCalc] : null;
  const calculateFn = selectedCalc ? calculatorFunctions[selectedCalc] : null;

  const handleInputChange = (name: string, value: string) => {
    setInputs((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleCalculate = () => {
    if (calculateFn && Object.keys(inputs).length > 0) {
      const calcResult = calculateFn(inputs);
      setResult({
        result: calcResult.result,
        unit: calcResult.unit,
        formula: calcResult.formula,
        steps: calcResult.steps,
        details: calcResult.details,
      });
    }
  };

  const handleReset = () => {
    setInputs({});
    setResult(null);
  };

  const handleSave = async () => {
    if (!result || !selectedCalc) return;
    setIsSaving(true);
    try {
      await api.post('/saved-calculations', {
        calculator: calculator?.name || selectedCalc,
        input: inputs,
        result,
      });
      toast.success('Calculation saved');
    } catch (error: any) {
      toast.error('Failed to save calculation');
    } finally {
      setIsSaving(false);
    }
  };

  // If calculator type is selected, show calculator interface
  if (selectedCalc && calculator) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Link to="/calculator" onClick={() => { setSelectedCalc(''); setResult(null); }}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">{calculator.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator size={18} />
                Input Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calculator.inputs.map((input) => (
                <Input
                  key={input.name}
                  label={`${input.label}${input.unit ? ` (${input.unit})` : ''}`}
                  type="number"
                  placeholder={input.defaultValue?.toString()}
                  defaultValue={input.defaultValue}
                  onChange={(e) => handleInputChange(input.name, e.target.value)}
                />
              ))}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">
                  <Calculator className="mr-2" size={16} />
                  Calculate
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  {/* Main Result */}
                  <div className="p-4 rounded-xl bg-[hsl(221.2,83.2%,53.3%)]/10 text-center">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Result</p>
                    <p className="text-3xl font-bold text-[hsl(221.2,83.2%,53.3%)]">
                      {result.result.toFixed(2)} {result.unit}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Formula: {result.formula}
                    </p>
                  </div>

                  {/* Step-by-Step Solution */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Step-by-Step Solution</h3>
                    <div className="space-y-2">
                      {result.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[hsl(var(--secondary))]">
                          <span className="text-xs font-bold text-[hsl(221.2,83.2%,53.3%)] min-w-5">
                            {i + 1}.
                          </span>
                          <div>
                            <p className="text-sm">{step.description}</p>
                            <p className="text-sm font-medium">{step.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  {result.details && Object.keys(result.details).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Detailed Breakdown</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(result.details).map(([key, value]) => (
                          <div key={key} className="p-2 rounded-lg border border-[hsl(var(--border))]">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </p>
                            <p className="text-sm font-medium">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Bookmark size={14} className="mr-1" />}
                      Save
                    </Button>
                    <Button variant="outline" size="sm">
                      <Printer size={14} className="mr-1" /> Print
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 size={14} className="mr-1" /> Share
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                  <Calculator className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>Enter values and click Calculate</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show calculator browser/grid
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Engineering Calculators</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Professional engineering calculations based on IS Codes and standard formulas
        </p>
      </div>

      {categories.map((category) => (
        <div key={category.name}>
          <h2 className="text-lg font-semibold mb-3">{category.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {category.items.map((calcKey) => {
              const meta = calculatorMetadata[calcKey];
              if (!meta) return null;
              return (
                <motion.div
                  key={calcKey}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={`/calculator/${calcKey}`}
                    onClick={() => {
                      setSelectedCalc(calcKey);
                      setResult(null);
                      setInputs({});
                    }}
                  >
                    <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-[hsl(221.2,83.2%,53.3%)]/10 text-[hsl(221.2,83.2%,53.3%)] group-hover:scale-110 transition-transform">
                            {calculatorIcons[calcKey] || <Calculator size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm">{meta.name}</h3>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                              {meta.description}
                            </p>
                            <p className="text-xs text-[hsl(221.2,83.2%,53.3%)] mt-2">
                              {meta.inputs.length} parameters
                            </p>
                          </div>
                          <ChevronRight
                            size={16}
                            className="mt-1 text-[hsl(var(--muted-foreground))] group-hover:translate-x-1 transition-transform"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}