import { Component, OnInit, OnDestroy, ElementRef, Input, EventEmitter, Output } from '@angular/core';
import { IonAccordionGroup, IonicModule } from '@ionic/angular';
import { IonContent } from '@ionic/angular';
import { ViewChild } from '@angular/core';
import { ScrollDetail } from '@ionic/angular';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ScrollService } from '../scroll.service';
import { RestService } from '../rest.service';
import { Body_Gestures, Facial_Expression, Speech, Tone_Voice, Routines_Blocks, Block } from '../models/blocks.model';
import { NewBlockService } from '../new-block.service'
import { PopUpService } from '../pop-up.service';
import { saveAs } from 'file-saver';
import { TabServiceService } from '../tab-service.service';
import { Routines, Send_block } from '../models/routines.model';

@Component({
  selector: 'app-sidebar-accordeon',
  templateUrl: './sidebar-accordeon.component.html',
  styleUrls: ['./sidebar-accordeon.component.scss'],
})
export class SidebarAccordeonComponent implements OnDestroy {
  @Output() agregarTabEvent = new EventEmitter<void>();

  onModifyClick(event: Event): void { // When clicking on modfy open new tab and load the routine
    this.rs.get_routine(this.pop_over_block.label).subscribe( 
      (response) => {
        let routine = new Routines(); // Transform the routine
        routine.name = this.pop_over_block.label; // Get the name of the new tab
        let i = 0;
        response.forEach(element => { // Add blocks to the routine
          routine.array_block.push([])
          element.forEach(block_item => {
            let block_i = new Send_block();
            block_i.class = block_item.class;
            block_i.name = block_item.name;
            block_i.level = block_item.level;
            block_i.talk = block_item.talk;
            block_i.clear = block_item.clear;
            routine.array_block[i].push(block_i);
          });
          i+=1;
        });
        this.tabService.addTabToContainer(this.pop_over_block, routine); // Add new container and push new_routine
      },
      (error) => {
        console.log(error);
      }
    )
  }
  
  @ViewChild(IonContent) content: IonContent;
  @ViewChild('full', { static: false }) full: IonContent;
  @ViewChild('listenerbig', { static: false }) listenerBig: IonAccordionGroup;
  @ViewChild('listenersmall', { static: false }) listenerSmall: IonAccordionGroup;
  @ViewChild('popover') popover;
  @ViewChild('popoversecond') popoversecond;
  private scrollSubscription: Subscription;
  
  talk: Speech;
  scroll_position: number;
  
  constructor(private scrollService: ScrollService, private rs: RestService, 
    private new_block: NewBlockService, private pop_up: PopUpService, 
    private tabService: TabServiceService) {

    this.scrollSubscription = this.scrollService.getScrollObservable().subscribe(({positionX, positionY }) => 
    {
      this.content.scrollToPoint(positionX, positionY, 500); // Realizar el scroll en este componente
    });

    this.talk = new Speech("", "Talk", "Talk block", "A1", "");

    this.new_block.newTab.subscribe((response) =>{ 
      // When adding a new tab check for new blocks in sidebar
      let incoming_routines: Routines_Blocks[] = [];

      // Call to REST service to fetch all documents from the Routines database
      this.rs.get_routines().subscribe(
        (response) =>{
          // The response is an array that contains arrays that represent the
          // documents from the Routines database
          this.actions = response[0];
          this.actions.forEach(element => {
            const block = new Routines_Blocks(element.id, element.label, element.description);
            block.color = "medium";
            incoming_routines.push(block);
          });

          if(this.actions_blocks.length != incoming_routines.length){
            // If different then update
            this.actions_blocks = incoming_routines;
          }
        });        
      });

  }

  ngOnDestroy() {
      this.scrollSubscription.unsubscribe(); // Importante desuscribirse al destruir el componente
  }

  // Where response is saved
  facial_expresions: Facial_Expression[] = [];
  body_gestures: Body_Gestures[] = [];
  sounds: Tone_Voice[] = [];
  verbal: Speech[] = [];
  actions: Routines_Blocks[] = [];

  // Where ts reads the blocks
  facial_expresions_blocks: Facial_Expression[] = [];
  body_gestures_blocks: Body_Gestures[] = [];
  sounds_blocks: Tone_Voice[] = [];
  verbal_blocks: Speech[] = [];
  actions_blocks: Routines_Blocks[] = [];

  // Pop-over is open or not
  isOpen = false;
  isOpenTwo= false;
  pop_over_block: Block;

  routine_images: string[] = [];

  only_once = true;

  ngOnInit() {

    // Call to REST service to fetch all documents from both databases
    this.rs.read_db()
    .subscribe(
      (response) => {
        console.log(response)
        // The response is an array of arrays.
        // Each array corresponds to all the documents fetched from the databases

        // First array corresponds to the facial expressions documents
        this.facial_expresions = response[0];

        this.facial_expresions.forEach(element => {
          const block = new Facial_Expression(element.id, element.label, element.description, element.id_in_robot, element.level);
          block.color = "success";
          this.facial_expresions_blocks.push(block);
        });

        // Second array corresponds to the body gestures documents
        this.body_gestures = response[1];

        this.body_gestures.forEach(element => {
          const block = new Body_Gestures(element.id, element.label, element.description, element.id_in_robot, element.level);
          block.color = "danger";
          this.body_gestures_blocks.push(block);
        });

        // TODO Cambiar nombre a arrays para que haga match con los arrays de python
        // Third array corresponds to the sounds documents
        this.sounds = response[2];

        this.sounds.forEach(element => {
          const block = new Tone_Voice(element.id, element.label, element.description, element.id_in_robot);
          block.color = "tertiary";
          this.sounds_blocks.push(block);
        });
        
        // Fourth array corresponds to the verbal documents
        this.verbal = response[3];

        this.verbal.forEach(element => {
          const block = new Speech(element.id, element.label, element.description, element.id_in_robot, element.utterance);
          block.color = "warning";
          if(element.label != "Talk"){
            console.log(element.label);
            this.verbal_blocks.push(block);
          } else {
            this.talk = block;
          }
        });

        // Fifth array corresponds to the routines documents
        this.actions = response[4];
        this.actions.forEach(element => {
          const block = new Routines_Blocks(element.id, element.label, element.description);
          block.color = "medium";
          this.actions_blocks.push(block)
        });
      },
      (error) => {
        console.log("No Data Found" + error);
      }
    )
  }

  onIonInfinite(ev: any) { // Scroll
    setTimeout(() => {
      (ev as InfiniteScrollCustomEvent).target.complete();
    }, 500);
  }

  // Aqui inica las funciones para hacer el Scroll
  handleScrollStart() {
    console.log('scroll start');
  }

  handleScroll(ev: CustomEvent<ScrollDetail>) {
    this.scroll_position = ev.detail.scrollTop
  }

  handleScrollEnd() {
    console.log('scroll end');
  }

  onDragEnd(event: DragEvent, block: Block): void { // When draggind send the block to block-component
    event.preventDefault();
    this.new_block.emitData(event, block);
  }

  openLastRoutine(event: any){
    // Call for last routine in the db and push on block-component
    let current_routine = new Routines();
    this.rs.get_recent_routine()
    .subscribe(
      (response) => {
          response[0].forEach(name => {
            current_routine.name = name
          });
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
          this.tabService.addTabToContainer(new Block(current_routine.id, current_routine.name, current_routine.description), 
          current_routine) // Open the new_tab and routine
      },(error) => {
          console.log("No Data Found" + error);
      }
    )      
  }

  async openPopover(color: string, e:MouseEvent, item: Block) { // Routine options when right clicking
    e.preventDefault();
    if (color === 'medium') {
      this.popover.event = e;
      this.isOpen = true;
      this.pop_over_block = item;
    } 
  }

  delete_routine(ev: Event){
    // Call to REST service to delete a routine from the Routines database.
    // Pass the routine's name in order to locate it in the database.
    console.log(this.pop_over_block);
    this.rs.delete_routine(this.pop_over_block["id"])
    .subscribe(
      (response) => {
        console.log(response);
      },
      (error) => {
        console.log(error);
      }
    )

    let i = 0;
    for(let item in this.actions_blocks){ // Delete the routine from the sideabar
      if(this.actions_blocks[item].label == this.pop_over_block.label){
        this.actions_blocks.splice(i, 1); // Splice = Pop in i posisition
      }
      i++;
    }

    this.isOpen = false;
  }

  download_routine(ev: Event){
    // Call to REST service to download the YAML file of a routine from the Routines database.
    // Pass the routine's name in order to locate it in the database.
    this.rs.download_routine(this.pop_over_block["id"])
    .subscribe(
      (response) => {
        const blob = new Blob([response], { type: 'text/yaml' });
        saveAs(blob, this.pop_over_block["label"] + ".yaml");
      },
      (error) => {
        console.log(error);
      }
    )
  }
}