import { Component, OnInit, Input } from '@angular/core'; 
import { CommonModule } from '@angular/common'; // Import CommonModule
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule] // Add CommonModule to the imports array
})
export class HomeComponent  implements OnInit {
  @Input() isVisible: boolean = true;

  constructor() { }
  getStarted(): void {
    // Aquí puedes agregar tu lógica para el botón de inicio, como navegar a otra ruta
  }

  ngOnInit() {}

}
