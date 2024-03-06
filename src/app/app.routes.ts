import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' }, // Redirige la ruta raíz a 'home'
  { path: 'home', component: HomeComponent },
  // No necesitas una ruta específica para AppComponent ya que es el componente raíz
];
