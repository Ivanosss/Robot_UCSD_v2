import { CommonModule } from '@angular/common';
import { Component,  Output, EventEmitter} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonicModule, PopoverController} from '@ionic/angular';
import { RoutineAreaModule } from './routine-area/routine-area.module';
import { SidebarModule } from './sidebar/sidebar.module';
import { ScrollDetail } from '@ionic/angular';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { PopUpService, SendDataRoutine } from './pop-up.service';
import { HttpClientModule } from '@angular/common/http';
import { RestService } from './rest.service';
import { NewBlockService } from './new-block.service';
import { BlockComponentComponent } from './block-component/block-component.component';
import { PopUpLoadPreviousRoutineComponent } from './pop-up-load-previous-routine/pop-up-load-previous-routine.component';
import { OnInit } from '@angular/core';
import { Block} from './models/blocks.model';
import { ViewChild,  ViewContainerRef, ComponentFactoryResolver } from '@angular/core';
import { Routines, Send_block } from './models/routines.model';
import { TabData } from './models/tabsdata';
import { TabServiceService } from './tab-service.service';
import { OverlayEventDetail} from '@ionic/core'; 
import * as yaml from '../../node_modules/js-yaml/dist/js-yaml';
import { RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavigationEnd} from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, RouterLink, RouterLinkActive, CommonModule, 
    RoutineAreaModule, 
    SidebarModule,
    FormsModule,
    HttpClientModule, RouterModule ],
    
  providers:[PopUpService, RestService, NewBlockService, BlockComponentComponent ],

})

export class AppComponent implements OnInit {
  @Output() agregarTab: EventEmitter<void> = new EventEmitter<void>();
  @Output() removeTabEvent = new EventEmitter<void>();
  @ViewChild('botonesContainer', { read: ViewContainerRef  }) botonesContainer: ViewContainerRef;
  showLayout = true;

  block_view: boolean = true; // Switching between block view and yaml view
  routine: Routines;
  opened_tab: number = 0; // id of the current opened tab
  routines: Array<Routines> = []; // All of the routines in the tabs
  renaming_routine: boolean = false;
  send_data_routine: SendDataRoutine = new SendDataRoutine();

  constructor(private router: Router,private new_block: NewBlockService, private popUpService: PopUpService, private componentFactoryResolver: ComponentFactoryResolver,
    private popoverController: PopoverController, private rs: RestService, private tabService: TabServiceService) {
      this.popUpService.retrieve_current_routine.subscribe( // When 'get' routine is called
        (data) =>{
          this.routine = data;
        });

        this.tabService.tabAdded.subscribe((data) => { // When tab is added
          this.agregarTabAlContainer(data.block, data.routine); // Add new tab and routine if applicable (specially when double clicking in a routine)
        });

      this.popUpService.clearRoutine.subscribe((idTabACerrar) => {
        if(this.routines.length == 1){ // If close the only tab, then push new empty rutine
          this.popUpService.push_routine(new Routines());
        }
      });

      this.popUpService.delete_tab.subscribe((idTabACerrar) => { // Close a tab
        console.log("CERRANDO TAB", idTabACerrar)
        this.tabDataList.splice(idTabACerrar, 1);
        this.routines.splice(idTabACerrar, 1);
        if (this.tabDataList.length === 0)
        {
          this.agregarTabAlContainer(); // Add new tab
          this.routines[0] = new Routines;  // Clean the current screen
        } else if (this.opened_tab != 0){
          this.opened_tab = this.opened_tab-1; 
        }
        this.popUpService.push_routine(this.routines[this.opened_tab]); // Open the left tab
      });

      this.popUpService.store_current_routine.subscribe((routine) => { //FUNCTION THAT CHANGES TAB AND UPDATES ROUTINE
        let new_Routine = new Routines();
        if (routine.new_routine != undefined){
          new_Routine = routine.new_routine; // Change for opened
        }
        this.routines.push(new_Routine);
        this.popUpService.push_routine(new_Routine); // Change for the incoming routine
        this.routines[this.opened_tab] = routine.current_routine;
        this.opened_tab = this.routines.length - 1;
        console.log("Opened tab", this.opened_tab);
      });

      this.popUpService.results_ready.subscribe((routine) => { 
        // Once the results on saved are ready, change the tab name for the new routine name
        this.tabDataList[this.opened_tab].tabName = routine.name;
      })
  }
  
  async ngOnInit() {
     // Suscribirse a los eventos de navegación para decidir cuándo mostrar el layout principal.

     
     this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Actualiza showMainLayout basándote en la URL actual
      this.showLayout = event.urlAfterRedirects !== '/home';
    });
    // Abre el popover personalizado tan pronto como la página se inicie
    const popover = await this.popoverController.create({
      component: PopUpLoadPreviousRoutineComponent, // Reemplaza con tu página de popover personalizado
      // Coloca las propiedades de posición y otros ajustes según tus necesidades
    });

    let current_routine: Routines = new Routines(); // Start a new routine

    await popover.present();
    await popover.onDidDismiss()
    .then((detail: OverlayEventDetail) => {
        if(detail.data == "yes"){
          
          // Call to REST service to fetch the most recently modified routine from the Routines database
          this.rs.get_recent_routine()
          .subscribe(
            (response) => {
                // The response is an array of arrays.

                // The first array corresponds to the routine's name in order 
                // to open the routine in a tab with its name.
                response[0].forEach(name => {
                  current_routine.name = name
                });
                
                // The second array corresponds to the routine's components.
                // Build the blocks that make up the routine by iterating 
                // through the array. 
                response[1].forEach(element => {
                  current_routine.array_block.push([]);
                  element.forEach(block_item => {
                    let block = new Send_block();
                    block.class = block_item.class;
                    block.name = block_item.name;
                    block.level = block_item.level;
                    block.talk = block_item.talk;
                    block.clear = block_item.clear;
                    current_routine.array_block[current_routine.array_block.length-1].push(block);
                  });
                });
                this.tabDataList[0].tabName = current_routine.name; // Missing bring back name of the routine
            },(error) => {
                console.log("No Data Found" + error);
            }
          )
          this.popUpService.push_routine(current_routine);
          this.routines[0] = current_routine;        
        }
    });

    // Recuperar el valor de mostrarBloque del almacenamiento local
    const mostrarBloqueLocalStorage = localStorage.getItem('mostrarBloque');
    this.mostrarBloque = mostrarBloqueLocalStorage === 'true'; // Convertir a boolean

  }
  
  ngAfterViewInit(){
    //NOTE: Se agrega un tab inmediamente al crear la app
    this.agregarTabAlContainer();
  }

  onIonInfinite(ev: any) {
    setTimeout(() => {
      (ev as InfiniteScrollCustomEvent).target.complete();
    }, 500);
  }

  // Aqui inica las funciones para hacer el Scroll
  handleScrollStart() {
    console.log('scroll start');
  }

  handleScroll(ev: CustomEvent<ScrollDetail>) {
    console.log('scroll', ev.detail);
  }

  handleScrollEnd() {
    console.log('scroll end');
  }

  onScroll(event: Event){
    console.log("Scrolled")
    this.new_block.sendScroll(event);
  }

  onNewPressed(){ // New tab
    this.agregarTabAlContainer();
  }

  mostrarBloque = false;
  id_contador = 0; // Variable para rastrear la cantidad de botones
  tabDataList: TabData[] = [];

  agregarTabAlContainer(item?:Block, routine?:Routines) {
      //Creando informacion del tab
      var id_actual = this.id_contador;
      var tabId = "tabid_" + id_actual.toString();
      var tabTitle = "";
      if(item){
        tabTitle = item.label;
      } else {
        tabTitle = "New Routine"
      }
      let now = new Date();
      let horaCreacion = `${now.getHours()}` + ":" + `${now.getMinutes()}` + ":" + `${now.getSeconds()}`;
      var dataInfo = "Tab creado a las: " + `${horaCreacion}`; // Puedes establecer la información según tus necesidades
      this.crearTab(tabTitle, dataInfo, tabId)
      var lastIndex = this.tabDataList.length - 1;
      this.tabDataList[lastIndex].tabName = tabTitle;
      // Escucha eventos o realiza otras acciones según sea necesario.
      this.mostrarBloque = true ;

      // Almacena mostrarBloque en el almacenamiento local
      localStorage.setItem('mostrarBloque', 'true');

      this.new_block.newTabClicked();

      this.popUpService.retrieve_routine("get");
      this.popUpService.retrieve_routine("change_tab", routine);
  }


  crearTab(tabName: string, extraInfo: string, tabId: string) {
    //Se crea el boton
    var datosTab = new TabData(tabName, extraInfo, tabId);
    this.tabDataList.push(datosTab);
    //return tab;
  }
  
  Switch_View(){
    // Function that alternates between yaml/block view
    this.popUpService.retrieve_routine("save_routine");
    this.popUpService.retrieve_routine("get");
    this.block_view = !this.block_view;

    // Call to REST service that indicates the user wants
    // a preview of the current routine in YAML format.
    this.rs.get_routine_text_preview()
        .subscribe(
          (response) => {
            if(document.getElementById("yamlText")){
              let display_data = {} as any;
    
              // Iterate through the current routine's blocks
              // and add them to a dictionary.
              for(let i=0; i < this.routine.array_block.length; i++){
                let Line = "Behave_" + (i+1);

                // Iterate through each of the properties of each 
                // block in the routine.
                // If property is null, 0, "" delete from object
                // and not show it on YAML preview
                for(let j=0; j < this.routine.array_block[i].length; j++){
                  Object.entries(this.routine.array_block[i][j]).forEach(([key, value]) => {
                      if(!value){
                        const name = `${key}`;
                        delete this.routine.array_block[i][j][name];
                      }

                    })
                }
                console.log(this.routine.array_block[i]);
                display_data[Line] = this.routine.array_block[i];
              }
    
              // Display the dictionary in a YAML formatted string.
              document.getElementById("yamlText").innerHTML = yaml.dump(display_data);;
            }
          },
          (error) => {
            console.log(error);
          }
        )  
  } 

  eliminarBoton(idTabACerrar: number) {
    this.popUpService.delete_tab.emit(idTabACerrar); // Close the current tab
  }

  tabClicked(event: Event, i:number){ // Change between tabs
    this.opened_tab = i;
    this.popUpService.push_routine(this.routines[i]);
  }

  currentTabClicked(event: Event, i:number){ //Change to text input to rename the routine when double clicking
    this.renaming_routine = true;
  }

  handleBlur(event:Event, i:number, value: string){ // Return to label when the user clicked away
    this.renaming_routine = false; // Change names and values
    this.routines[i].name = value
    this.tabDataList[i].tabName = value
    
    this.send_data_routine.routine = this.routines[i]; // Upload the new name
    this.send_data_routine.type_def = "Show_Routine";
    this.popUpService.saveRoutineEvent.emit(this.send_data_routine);
  }
}
